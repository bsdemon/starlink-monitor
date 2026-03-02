from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List

from ninja.errors import HttpError

from .constants import BUCKET_TO_INTERVAL, METRICS_TO_SQL_COLUMN
from .repository import (
    list_devices_latest_location, 
    get_device_latest, 
    get_snapshot_for_day, 
    get_day_stats, 
    get_alert_counts, 
    get_timeseries_rows, 
    get_alert_events,
    get_metadata,

)
from .helpers import clamp_bucket, parse_iso_datetime


def device_name(device_id: str) -> str:
    suffix = device_id[-4:] if len(device_id) >= 4 else device_id
    return f"UT-{suffix}"


def parse_metrics(metrics: str | None) -> list[str]:
    default = [
        "downlinkMbps",
        "uplinkMbps",
        "pingLatencyMsAvg",
        "pingDropRateAvg",
        "obstructionPercentTime",
        "signalQuality",
    ]
    if not metrics:
        return default

    raw = [x.strip() for x in metrics.split(",") if x.strip()]
    if not raw:
        return default

    invalid = [m for m in raw if m not in METRICS_TO_SQL_COLUMN]
    if invalid:
        raise HttpError(400, f"Invalid metrics: {invalid}")

    out: list[str] = []
    seen: set[str] = set()
    for m in raw:
        if m not in seen:
            out.append(m)
            seen.add(m)
    return out


def resolve_alert_codes(
    codes: List[int],
    device_type: str,
    metadata_key: str = "telemetry_stream_metadata",
) -> List[str]:
    """
    Convert alert numeric codes to their string representations
    using stored Starlink metadata JSON.
    """
    payload = get_metadata(metadata_key)

    alerts_map = (
        payload
        .get("enums", {})
        .get("AlertsByDeviceType", {})
        .get(device_type, {})
    )

    # JSON keys are strings, so convert int -> str
    return list([
        alerts_map.get(str(code)).replace("_", " ").upper()
        for code in codes
        if str(code) in alerts_map
    ])

def get_devices()-> list[dict]:
    rows = list_devices_latest_location()
    return [
        {
            "deviceId": r["device_id"],
            "name": device_name(r["device_id"]),
            "location": {"lat": r.get("ut_lat"), "lon": r.get("ut_lon"), "h3CellId": r.get("h3_cell_id")},
        }
        for r in rows
    ]


def get_summary(device_id: str, day_str: str)-> dict:
    try:
        d = date.fromisoformat(day_str)
    except ValueError:
        raise HttpError(400, "day must be YYYY-MM-DD")

    dt_from = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    dt_to = dt_from + timedelta(days=1)

    dev = get_device_latest(device_id)
    if dev is None:
        raise HttpError(404, f"Unknown device_id '{device_id}'")

    snap = get_snapshot_for_day(device_id, dt_from, dt_to)
    stats = get_day_stats(device_id, dt_from, dt_to)
    counts_rows = get_alert_counts(device_id, dt_from, dt_to)

    active = list(snap["active_alerts"]) if snap and snap.get("active_alerts") is not None else []
    # if len(active) > 0:
    #     active = resolve_alert_codes(active, dev["device_type"])

    return {
        "device": {
            "deviceId": dev["device_id"],
            "name": device_name(dev["device_id"]),
            "location": {"lat": dev.get("ut_lat"), "lon": dev.get("ut_lon"), "h3CellId": dev.get("h3_cell_id")},
        },
        "snapshot": None if not snap else {
            "ts": snap["ts"].astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "downlinkMbps": snap.get("downlink_throughput_mbps"),
            "uplinkMbps": snap.get("uplink_throughput_mbps"),
            "pingLatencyMsAvg": snap.get("ping_latency_ms_avg"),
            "pingDropRateAvg": snap.get("ping_drop_rate_avg"),
            "obstructionPercentTime": snap.get("obstruction_percent_time"),
            "signalQuality": snap.get("signal_quality"),
            "uptimeS": snap.get("uptime_s"),
            "runningSoftwareVersion": snap.get("running_software_version"),
            "secondsUntilSwupdateRebootPossible": snap.get("seconds_until_swupdate_reboot_possible"),
        },
        "dayStats": None if not stats else {
            "range": {"from": dt_from.isoformat().replace("+00:00", "Z"), "to": dt_to.isoformat().replace("+00:00", "Z")},
            "downlinkMbps": {"min": stats["dl_min"], "avg": stats["dl_avg"], "max": stats["dl_max"]},
            "uplinkMbps": {"min": stats["ul_min"], "avg": stats["ul_avg"], "max": stats["ul_max"]},
            "pingLatencyMsAvg": {"min": stats["lat_min"], "avg": stats["lat_avg"], "max": stats["lat_max"]},
            "pingDropRateAvg": {"min": stats["drop_min"], "avg": stats["drop_avg"], "max": stats["drop_max"]},
            "obstructionPercentTime": {"min": stats["obs_min"], "avg": stats["obs_avg"], "max": stats["obs_max"]},
            "signalQuality": {"min": stats["sq_min"], "avg": stats["sq_avg"], "max": stats["sq_max"]},
        },
        "alerts": {
            "active": active,
            "countsByAlertId": {r["alert_id"]: r["cnt"] for r in counts_rows},
        },
    }


def get_timeseries(device_id: str, from_str: str, to_str: str, bucket: str, metrics: str | None)-> dict:
    dt_from = parse_iso_datetime(from_str)
    dt_to = parse_iso_datetime(to_str)
    if dt_to <= dt_from:
        raise HttpError(400, "'to' must be greater than 'from'")

    bucket_final = clamp_bucket(bucket, dt_from, dt_to)
    interval = BUCKET_TO_INTERVAL[bucket_final]
    metric_list = parse_metrics(metrics)

    select_parts = [f'AVG({METRICS_TO_SQL_COLUMN[m]}) AS "{m}"' for m in metric_list]
    rows = get_timeseries_rows(device_id, dt_from, dt_to, interval, select_sql=", ".join(select_parts))
    events = get_alert_events(device_id, dt_from, dt_to, interval)

    events_str: List[str] = []
    if len(events) != 0:
        events_str = resolve_alert_codes(events, "u")
    series: dict[str, list[list[int | float | None]]] = {m: [] for m in metric_list}
    for r in rows:
        t_ms = int(r["t_ms"])
        for m in metric_list:
            v = r.get(m)
            series[m].append([t_ms, None if v is None else float(v)])

    return {
        "bucket": bucket_final,
        "from": dt_from.isoformat().replace("+00:00", "Z"),
        "to": dt_to.isoformat().replace("+00:00", "Z"),
        "series": series,
        "events": {"alerts": events_str},
    }