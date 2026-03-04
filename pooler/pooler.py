import os
import sys
import time
import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple

import h3
from loguru import logger
from psycopg import sql
import requests
import psycopg

from get_service_info import sync_service_lines_if_due


SERVICE_LINES_REFRESH = timedelta(minutes=10)
SERVICE_LINES_RETRY = timedelta(minutes=5)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)

METADATA_KEY = "telemetry_stream_metadata"


def get_starlink_access_token() -> str:
    resp = requests.post(
        "https://starlink.com/api/auth/connect/token",
        data={
            "client_id": os.environ.get("STARLINK_CLIENT_ID"),
            "client_secret": os.environ.get("STARLINK_CLIENT_SECRET"),
            "grant_type": "client_credentials",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

def compute_checksum(obj: Any) -> str:
    """
    Compute stable sha256 checksum for a JSON-serializable object.
    """
    raw = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def h3_to_latlon(h3_cell_id: int) -> tuple[float, float]:
    # H3 Python works with hex string, so convert int -> hex
    h = format(h3_cell_id, "x")
    lat, lon = h3.cell_to_latlng(h)  # returns (lat, lon)
    return lat, lon

def ns_to_ts(utc_timestamp_ns: int) -> datetime:
    return datetime.fromtimestamp(utc_timestamp_ns / 1e9, tz=timezone.utc)

def connect_db() -> psycopg.Connection:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL is not set")
    # Autocommit False by default in psycopg v3, but keep it explicit
    conn = psycopg.connect(dsn, autocommit=False)
    return conn

def build_row_dict(columns: List[str], values: List[Any]) -> Dict[str, Any]:
    """ Map column name -> value by position """
    return dict(zip(columns, values))

def parse_stream_payload(response_json: Dict[str, Any]) -> Tuple[List[Tuple], List[Tuple], List[Tuple]]:
    """
    Returns tuples ready for insert:
      - rows_u for telemetry_u
      - rows_r for telemetry_r
      - rows_i for telemetry_i
    """
    telemetry_values = response_json["data"]["values"]
    cols_by_type = response_json["data"]["columnNamesByDeviceType"]

    logger.info(f"---->> Telemetry stream len is: {len(telemetry_values)}<<--------")
    cols_u = cols_by_type.get("u", [])
    cols_r = cols_by_type.get("r", [])
    cols_i = cols_by_type.get("i", [])

    rows_u: List[Tuple] = []
    rows_r: List[Tuple] = []
    rows_i: List[Tuple] = []

    def normalize_alerts(value: Any) -> Any:
        # Normalize alerts to list[int] or None
        if value is None:
            return None
        if isinstance(value, list):
            return [int(x) for x in value]
        return [int(value)]

    def normalize_ip(value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, list):
            if not value:
                return None
            value = value[0]
        s = str(value).strip()
        return s or None

    def to_bool(v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, bool):
            return v
        # Some APIs send 0/1
        if isinstance(v, (int, float)):
            return bool(v)
        if isinstance(v, str):
            s = v.lower().strip()
            if s in ("true", "1", "yes"):
                return True
            if s in ("false", "0", "no"):
                return False
        return None

    for item in telemetry_values:
        if not item:
            continue

        device_type = item[0]  # "DeviceType" is first column in all types

        if device_type == "u":
            row = build_row_dict(cols_u, item)

            utc_ns = int(row["UtcTimestampNs"])
            ts = ns_to_ts(utc_ns)
            active_alerts_arr = normalize_alerts(row.get("ActiveAlerts"))
            lat, lon = h3_to_latlon(int(row["H3CellId"])) if row.get("H3CellId") is not None else (None, None)
            rows_u.append(
                (
                    ts,
                    str(row.get("DeviceId") or ""),
                    "u",
                    float(row["DownlinkThroughput"]) if row.get("DownlinkThroughput") is not None else None,
                    float(row["UplinkThroughput"]) if row.get("UplinkThroughput") is not None else None,
                    float(row["PingDropRateAvg"]) if row.get("PingDropRateAvg") is not None else None,
                    float(row["PingLatencyMsAvg"]) if row.get("PingLatencyMsAvg") is not None else None,
                    float(row["ObstructionPercentTime"]) if row.get("ObstructionPercentTime") is not None else None,
                    int(row["Uptime"]) if row.get("Uptime") is not None else None,
                    float(row["SignalQuality"]) if row.get("SignalQuality") is not None else None,
                    int(row["H3CellId"]) if row.get("H3CellId") is not None else None,
                    int(row["SecondsUntilSwupdateRebootPossible"])
                    if row.get("SecondsUntilSwupdateRebootPossible") is not None
                    else None,
                    row.get("RunningSoftwareVersion"),
                    active_alerts_arr,
                    utc_ns,
                    lat,
                    lon,
                )
            )

        elif device_type == "r":
            row = build_row_dict(cols_r, item)
            # row = filter_router_row(row)

            utc_ns = int(row["UtcTimestampNs"])
            ts = ns_to_ts(utc_ns)
            active_alerts_arr = normalize_alerts(row.get("ActiveAlerts"))

            rows_r.append(
                (
                    ts,
                    str(row.get("DeviceId") or ""),
                    "r",
                    int(row["WifiUptimeS"]) if row.get("WifiUptimeS") is not None else None,
                    row.get("WifiSoftwareVersion"),
                    row.get("WifiHardwareVersion"),
                    to_bool(row.get("WifiIsRepeater")),
                    int(row["WifiHopsFromController"]) if row.get("WifiHopsFromController") is not None else None,
                    to_bool(row.get("WifiIsBypassed")),
                    float(row["InternetPingDropRate"]) if row.get("InternetPingDropRate") is not None else None,
                    float(row["InternetPingLatencyMs"]) if row.get("InternetPingLatencyMs") is not None else None,
                    float(row["WifiPopPingDropRate"]) if row.get("WifiPopPingDropRate") is not None else None,
                    float(row["WifiPopPingLatencyMs"]) if row.get("WifiPopPingLatencyMs") is not None else None,
                    float(row["DishPingDropRate"]) if row.get("DishPingDropRate") is not None else None,
                    float(row["DishPingLatencyMs"]) if row.get("DishPingLatencyMs") is not None else None,
                    int(row["Clients"]) if row.get("Clients") is not None else None,
                    int(row["Clients2Ghz"]) if row.get("Clients2Ghz") is not None else None,
                    int(row["Clients5Ghz"]) if row.get("Clients5Ghz") is not None else None,
                    int(row["ClientsEth"]) if row.get("ClientsEth") is not None else None,
                    int(row["WanRxBytes"]) if row.get("WanRxBytes") is not None else None,
                    int(row["WanTxBytes"]) if row.get("WanTxBytes") is not None else None,
                    row.get("DishId"),
                    active_alerts_arr,
                    utc_ns,
                )
            )

        elif device_type == "i":
            row = build_row_dict(cols_i, item)

            utc_ns = int(row["UtcTimestampNs"])
            ts = ns_to_ts(utc_ns)

            rows_i.append(
                (
                    ts,
                    str(row.get("DeviceId") or ""),
                    "i",
                    normalize_ip(row.get("Ipv4")),
                    normalize_ip(row.get("Ipv6Ue")),
                    normalize_ip(row.get("Ipv6Cpe")),
                    utc_ns,
                )
            )

        else:
            # Unknown device type; ignore safely
            continue
    return rows_u, rows_r, rows_i

def copy_rows(cur: psycopg.Cursor, table: str, columns: List[str], rows: List[Tuple]) -> None:
    if not rows:
        return

    table_sql = sql.Identifier(table)

    query = sql.SQL("COPY {} ({}) FROM STDIN").format(
        table_sql,
        sql.SQL(", ").join(sql.Identifier(c) for c in columns),
    )

    with cur.copy(query) as copy:
        for row in rows:
            copy.write_row(row)

def insert_rows(conn: psycopg.Connection, rows_u: List[Tuple], rows_r: List[Tuple], rows_i: List[Tuple]) -> None:
    with conn.cursor() as cur:
        copy_rows(
            cur,
            "telemetry_u",
            [
                "ts",
                "device_id",
                "device_type",
                "downlink_throughput_mbps",
                "uplink_throughput_mbps",
                "ping_drop_rate_avg",
                "ping_latency_ms_avg",
                "obstruction_percent_time",
                "uptime_s",
                "signal_quality",
                "h3_cell_id",
                "seconds_until_swupdate_reboot_possible",
                "running_software_version",
                "active_alerts",
                "utc_timestamp_ns",
                "ut_lat",
                "ut_lon",
            ],
            rows_u,
        )

        copy_rows(
            cur,
            "telemetry_r",
            [
                "ts",
                "device_id",
                "device_type",
                "wifi_uptime_s",
                "wifi_software_version",
                "wifi_hardware_version",
                "wifi_is_repeater",
                "wifi_hops_from_controller",
                "wifi_is_bypassed",
                "internet_ping_drop_rate",
                "internet_ping_latency_ms",
                "wifi_pop_ping_drop_rate",
                "wifi_pop_ping_latency_ms",
                "dish_ping_drop_rate",
                "dish_ping_latency_ms",
                "clients",
                "clients_2ghz",
                "clients_5ghz",
                "clients_eth",
                "wan_rx_bytes",
                "wan_tx_bytes",
                "dish_id",
                "active_alerts",
                "utc_timestamp_ns",
            ],
            rows_r,
        )

        copy_rows(
            cur,
            "telemetry_i",
            [
                "ts",
                "device_id",
                "device_type",
                "ipv4",
                "ipv6_ue",
                "ipv6_cpe",
                "utc_timestamp_ns",
            ],
            rows_i,
        )

    conn.commit()

def upsert_metadata(conn: psycopg.Connection, payload: Dict[str, Any]) -> None:
    """
    Upsert Starlink metadata into DB only if checksum changes.
    Uses psycopg connection directly (no Django ORM required).
    """
    meta = payload.get("metadata")
    if not meta:
        return

    checksum = compute_checksum(meta)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT checksum FROM starlink_metadata WHERE key = %s",
            (METADATA_KEY,),
        )
        row = cur.fetchone()
        if row and row[0] == checksum:
            return  # unchanged

        cur.execute(
            """
            INSERT INTO starlink_metadata (key, payload, checksum, updated_at)
            VALUES (%s, %s::jsonb, %s, NOW())
            ON CONFLICT (key) DO UPDATE
              SET payload = EXCLUDED.payload,
                  checksum = EXCLUDED.checksum,
                  updated_at = NOW()
            """,
            (METADATA_KEY, json.dumps(meta, ensure_ascii=False), checksum),
        )

def safe_rollback(conn):
    try:
        if conn and not conn.closed:
            conn.rollback()
    except Exception as exc:
        logger.exception("Rollback failed: %s", exc)

def poll_stream(conn: psycopg.Connection, access_token: str) -> Tuple[Dict[str, Any] | None, str | None]:
    """
    Continuously polls the Starlink Telemetry Stream API using long-polling.

    This function establishes an authenticated connection to the
    `/api/public/v2/telemetry/stream` endpoint and continuously retrieves
    telemetry batches for all available device types ("u", "r", "i").

    The endpoint uses long-polling semantics:
        - The request may block for up to `maxLingerMs` milliseconds
          while waiting for new telemetry data.
        - If new data becomes available, the response is returned immediately.
        - If no data is available, an empty batch is returned after the linger timeout.

    Behavior:
        - Parses the received telemetry payload into device-specific rows.
        - Performs batched ingestion into TimescaleDB using COPY.
        - Retries on transient network or database errors with a small backoff.

    This function runs indefinitely and is intended to be executed
    as a standalone ingestion service (e.g., inside a Docker container).

    Notes:
        - The ingestion rate depends on Starlink's telemetry update frequency
          (typically ~10–15 seconds).
        - `batchSize` controls the maximum number of telemetry records returned.
        - `maxLingerMs` controls how long the server waits before returning
          an empty response if no new data is available.
    """
    logger.info("=== Polling Starlink telemetry stream started! ===")
    if not access_token:
        logger.error("Access token is required to poll telemetry stream")
        return None, "no token"

    resp = requests.post(
        "https://starlink.com/api/public/v2/telemetry/stream",
        json={"batchSize": 1000, "maxLingerMs": 15000},
        headers={
            "content-type": "application/json",
            "accept": "*/*",
            "Authorization": f"Bearer {access_token}",
        },
        timeout=40,
    )

    if resp.status_code in (401, 403):
        logger.warning(f"Unauthorized access when polling telemetry stream: {resp.status_code} {resp.text}")
        return None, "token_expired"

    resp.raise_for_status()
    payload = resp.json()

    try:
        upsert_metadata(conn, payload)
        conn.commit()
    except Exception as e:
        logger.warning(f"Metadata upsert failed: {e}")
        safe_rollback(conn)

    telemetry = payload["data"]["values"]
    if not telemetry:
        logger.info("No telemetry received")
        return None, None

    rows_u, rows_r, rows_i = parse_stream_payload(payload)

    if rows_u or rows_r or rows_i:
        insert_rows(conn, rows_u, rows_r, rows_i)
        logger.info(f"Inserted telemetry rows: {len(rows_u)}U, {len(rows_r)}R, {len(rows_i)}I")

    return payload, None

def main():
    access_token = get_starlink_access_token()
    if not access_token:
        logger.error("Failed to obtain Starlink access token")
        sys.exit(1)

    conn = connect_db()

    service_state = {
        "next_refresh": utc_now()
    }

    while True:
        try:
            sync_service_lines_if_due(conn, access_token, service_state)

            _, err = poll_stream(conn, access_token)

            if err == "token_expired":
                logger.warning(" Access token expired, refreshing...")
                access_token = get_starlink_access_token()

        except (requests.RequestException, ValueError):
            time.sleep(2)
            continue

        except psycopg.Error as e:
            logger.exception(f"DB error during ingest: {e}")
            safe_rollback(conn)
            time.sleep(2)
            continue

if __name__ == "__main__":
    main()