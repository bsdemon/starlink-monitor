from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg
from loguru import logger
import requests

SERVICE_LINES_REFRESH = timedelta(hours=6)
SERVICE_LINES_RETRY = timedelta(minutes=5)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def get_starlink_service_lines(access_token: str) -> list[dict[str, Any]]:
    """
    Fetch additional metadata for service lines.

    Endpoint:
        GET /api/public/v2/service-lines

    Returns a list of service line objects.
    """
    resp=requests.get(
        "https://starlink.com/api/public/v2/service-lines",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    content = data.get("content")
    if not content:
        logger.warning(f"Service lines response missing content: {resp.text}")
        return []
    return content['results']


def get_starlink_user_terminals_data(access_token: str) -> list[dict[str, Any]]:
    """
    Fetch additional metadata for user terminals.

    Endpoint:
        GET /api/public/v2/user-terminals

    Returns a list of terminal objects.
    """
    resp = requests.get(
        "https://starlink.com/api/public/v2/user-terminals",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
        timeout=30,
    )

    resp.raise_for_status()

    data = resp.json()

    content = data.get("content")
    if not content:
        logger.warning(f"User terminals response missing content: {resp.text}")
        return []
    return content['results']

# def _extract_results(data: dict[str, Any]) -> list[dict[str, Any]]:
#     """
#     Extract list of results from Starlink list endpoints.

#     Accepts either:
#       {"content": {"results": [...]}}
#     or:
#       {"content": [...]}
#     or:
#       {"results": [...]}
#     """
#     content = data.get("content")
#     if isinstance(content, dict):
#         results = content.get("results")
#         return results if isinstance(results, list) else []
#     if isinstance(content, list):
#         return content
#     results = data.get("results")
#     return results if isinstance(results, list) else []


def _first_router_id(terminal: dict[str, Any]) -> str | None:
    routers = terminal.get("routers")
    if not isinstance(routers, list) or not routers:
        return None
    for r in routers:
        if isinstance(r, dict):
            rid = r.get("routerId") or r.get("router_id")
            if rid:
                return str(rid)
    return None


def upsert_directory_rows(conn: psycopg.Connection, rows: list[dict[str, Any]]) -> int:
    """
    Upsert normalized directory rows into DB.
    Returns number of processed rows (not exact affected count).
    """
    if not rows:
        return 0

    sql = """
    INSERT INTO starlink_device_info (
      device_id,
      nickname,
      subscription_id,
      user_terminal_kit_id,
      user_terminal_dish_id,
      router_id,
      last_updated
    )
    VALUES (%s, %s, %s, %s, %s, %s, now())
    ON CONFLICT (device_id) DO UPDATE
    SET nickname = EXCLUDED.nickname,
        subscription_id = EXCLUDED.subscription_id,
        user_terminal_kit_id = EXCLUDED.user_terminal_kit_id,
        user_terminal_dish_id = EXCLUDED.user_terminal_dish_id,
        router_id = EXCLUDED.router_id,
        last_updated = now()
    """

    with conn.cursor() as cur:
        for r in rows:
            cur.execute(
                sql,
                (
                    r.get("user_terminal_id"),
                    r.get("nickname"),
                    r.get("service_line_number"),
                    r.get("kit_serial_number"),
                    r.get("dish_serial_number"),
                    r.get("router_id"),
                ),
            )

    conn.commit()
    return len(rows)


def sync_service_lines_if_due(
    conn: psycopg.Connection,
    access_token: str,
    state: dict[str, Any]
) -> None:
    """
    Refresh service lines + user terminals periodically and store stable account/device directory info.

    state expects:
      state["next_refresh"] : datetime
    """
    if utc_now() < state["next_refresh"]:
        return

    try:
        # Fetch
        sl_raw = get_starlink_service_lines(access_token)          # you currently return content["results"]
        ut_raw = get_starlink_user_terminals_data(access_token)    # you currently return content["results"]

        # Normalize service lines to a mapping we can join against (best effort).
        # NOTE: I don't know the exact keys in service-lines payload in your account,
        # so we keep it flexible.
        service_lines: list[dict[str, Any]] = sl_raw if isinstance(sl_raw, list) else []
        terminals: list[dict[str, Any]] = ut_raw if isinstance(ut_raw, list) else []

        # If you have service line ids that match terminals, you can join.
        # For now we store per-terminal and include serviceLineNumber/nickname if available.
        # Many payloads carry those directly on terminal or via serviceLineId.
        sl_by_id: dict[str, dict[str, Any]] = {}
        sl_by_number: dict[str, dict[str, Any]] = {}

        for sl in service_lines:
            if not isinstance(sl, dict):
                continue
            sid = sl.get("serviceLineId") or sl.get("id")
            if sid:
                sl_by_id[str(sid)] = sl

            num = sl.get("serviceLineNumber")
            if isinstance(num, str) and num.strip():
                sl_by_number[num.strip()] = sl

        normalized: list[dict[str, Any]] = []

        for t in terminals:
            if not isinstance(t, dict):
                continue

            # Terminal id
            raw_utid = t.get("userTerminalId") or t.get("terminalId") or t.get("id")
            if not raw_utid:
                continue
            raw_utid = str(raw_utid)

            # Ensure we store device_id as "ut<id>"
            device_id = raw_utid if raw_utid.startswith("ut") else f"ut{raw_utid}"

            # Service line identifiers (best effort)
            service_line_number = t.get("serviceLineNumber")
            service_line_number = str(service_line_number).strip() if service_line_number else None

            service_line_id = t.get("serviceLineId") or t.get("service_line_id")
            service_line_id = str(service_line_id) if service_line_id else None

            # Join to service-lines (try id first, then number)
            sl_obj = None
            if service_line_id:
                sl_obj = sl_by_id.get(service_line_id)
            if not sl_obj and service_line_number:
                sl_obj = sl_by_number.get(service_line_number)

            # Nickname logic:
            # 1) terminal nickname (if not null)
            # 2) service-line nickname (fallback)
            nickname = t.get("nickname")
            if not nickname and sl_obj:
                nickname = sl_obj.get("nickname") or sl_obj.get("displayName") or sl_obj.get("name")

            row = {
                "user_terminal_id": device_id,
                "nickname": str(nickname).strip() if isinstance(nickname, str) and nickname.strip() else None,
                "service_line_number": service_line_number,
                "kit_serial_number": str(t.get("kitSerialNumber")) if t.get("kitSerialNumber") else None,
                "dish_serial_number": str(t.get("dishSerialNumber")) if t.get("dishSerialNumber") else None,
                "router_id": _first_router_id(t),
            }
            normalized.append(row)

        # Store
        written = upsert_directory_rows(conn, normalized)

        # Log a stable summary (not [0])
        logger.info(
            f"Directory sync OK: service_lines={len(service_lines)} terminals={len(terminals)} upserted={written}"
        )

        if normalized:
            sample = normalized[0]
            logger.info(
                "Sample: "
                f"Nickname={sample.get('nickname')} | "
                f"Subscription={sample.get('service_line_number')} | "
                f"UserTerminal={sample.get('user_terminal_id')} | "
                f"Kit={sample.get('kit_serial_number')} | "
                f"Dish={sample.get('dish_serial_number')} | "
                f"Router={sample.get('router_id')}"
            )

        state["next_refresh"] = utc_now() + SERVICE_LINES_REFRESH

    except Exception as e:
        logger.warning(f"Could not refresh directory data: {e}")
        state["next_refresh"] = utc_now() + SERVICE_LINES_RETRY