from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db import connection
from psycopg import rows

from telemetry.models import StarlinkMetadata

from .constants import I_TABLE, UT_TABLE


def _fetchall_dict(cur) -> list[dict[str, Any]]:
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _fetchone_dict(cur) -> dict[str, Any] | None:
    row = cur.fetchone()
    if row is None:
        return None
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))

def list_devices_latest_location() -> list[dict[str, Any]]:
    sql = """
        SELECT DISTINCT ON (u.device_id)
            u.device_id,
            u.ut_lat,
            u.ut_lon,
            u.h3_cell_id,
            ti.ipv4,
            ti.ipv6_ue
        FROM telemetry_u u
        LEFT JOIN (
            SELECT DISTINCT ON (device_id)
                device_id,
                ipv4,
                ipv6_ue
            FROM telemetry_i
            ORDER BY device_id, ts DESC
        ) ti
        ON ti.device_id = 'ip-' || u.device_id
        ORDER BY u.device_id, u.ts DESC;
    """
    with connection.cursor() as cur:
        cur.execute(sql)
        return _fetchall_dict(cur)


def get_device_latest(device_id: str) -> dict[str, Any] | None:
    sql = f"""
        SELECT device_id, ut_lat, ut_lon, h3_cell_id
        FROM {UT_TABLE}
        WHERE device_id = %(device_id)s
        ORDER BY ts DESC
        LIMIT 1;
    """
    with connection.cursor() as cur:
        cur.execute(sql, {"device_id": device_id})
        return _fetchone_dict(cur)


def get_snapshot_for_day(device_id: str, dt_from: datetime, dt_to: datetime) -> dict[str, Any] | None:
    sql = f"""
        SELECT
            ts,
            downlink_throughput_mbps,
            uplink_throughput_mbps,
            ping_latency_ms_avg,
            ping_drop_rate_avg,
            obstruction_percent_time,
            signal_quality,
            uptime_s,
            running_software_version,
            seconds_until_swupdate_reboot_possible,
            active_alerts
        FROM {UT_TABLE}
        WHERE device_id = %(device_id)s
          AND ts >= %(dt_from)s
          AND ts <  %(dt_to)s
        ORDER BY ts DESC
        LIMIT 1;
    """
    with connection.cursor() as cur:
        cur.execute(sql, {"device_id": device_id, "dt_from": dt_from, "dt_to": dt_to})
        return _fetchone_dict(cur)


def get_day_stats(device_id: str, dt_from: datetime, dt_to: datetime) -> dict[str, Any] | None:
    sql = f"""
        SELECT
            MIN(downlink_throughput_mbps) AS dl_min, AVG(downlink_throughput_mbps) AS dl_avg, MAX(downlink_throughput_mbps) AS dl_max,
            MIN(uplink_throughput_mbps)   AS ul_min, AVG(uplink_throughput_mbps)   AS ul_avg, MAX(uplink_throughput_mbps)   AS ul_max,
            MIN(ping_latency_ms_avg)      AS lat_min,AVG(ping_latency_ms_avg)      AS lat_avg,MAX(ping_latency_ms_avg)      AS lat_max,
            MIN(ping_drop_rate_avg)       AS drop_min,AVG(ping_drop_rate_avg)      AS drop_avg,MAX(ping_drop_rate_avg)      AS drop_max,
            MIN(obstruction_percent_time) AS obs_min,AVG(obstruction_percent_time) AS obs_avg,MAX(obstruction_percent_time) AS obs_max,
            MIN(signal_quality)           AS sq_min, AVG(signal_quality)           AS sq_avg, MAX(signal_quality)           AS sq_max
        FROM {UT_TABLE}
        WHERE device_id = %(device_id)s
          AND ts >= %(dt_from)s
          AND ts <  %(dt_to)s;
    """
    with connection.cursor() as cur:
        cur.execute(sql, {"device_id": device_id, "dt_from": dt_from, "dt_to": dt_to})
        return _fetchone_dict(cur)

def get_ip_address(device_id: str) -> dict[str, Any] | None:
    device_id = f"ip-{device_id}"
    sql = f"""
        SELECT ipv4, ipv6_ue
        FROM {I_TABLE}
        WHERE device_id = %(device_id)s
        ORDER BY ts DESC
        LIMIT 1;
    """
    with connection.cursor() as cur:
        cur.execute(sql, {"device_id": device_id})
        return _fetchone_dict(cur)


def get_alert_counts(device_id: str, dt_from: datetime, dt_to: datetime) -> list[dict[str, Any]]:
    sql = f"""
        SELECT a.alert_id::text AS alert_id, COUNT(*)::int AS cnt
        FROM {UT_TABLE} t
        CROSS JOIN LATERAL unnest(COALESCE(t.active_alerts, '{{}}'::int[])) AS a(alert_id)
        WHERE t.device_id = %(device_id)s
          AND t.ts >= %(dt_from)s
          AND t.ts <  %(dt_to)s
        GROUP BY a.alert_id
        ORDER BY cnt DESC, a.alert_id ASC;
    """
    with connection.cursor() as cur:
        cur.execute(sql, {"device_id": device_id, "dt_from": dt_from, "dt_to": dt_to})
        return _fetchall_dict(cur)


def get_timeseries_rows(
    device_id: str,
    dt_from: datetime,
    dt_to: datetime,
    interval: str,
    select_sql: str,
) -> list[dict[str, Any]]:
    sql = f"""
        SELECT
            (EXTRACT(EPOCH FROM time_bucket(%(interval)s::interval, ts)) * 1000)::bigint AS t_ms,
            {select_sql}
        FROM {UT_TABLE}
        WHERE device_id = %(device_id)s
          AND ts >= %(dt_from)s
          AND ts <  %(dt_to)s
        GROUP BY 1
        ORDER BY 1;
    """
    with connection.cursor() as cur:
        cur.execute(sql, {"interval": interval, "device_id": device_id, "dt_from": dt_from, "dt_to": dt_to})
        return _fetchall_dict(cur)


def get_alert_events(device_id: str, dt_from: datetime, dt_to: datetime, interval: str) -> list[int]:
    sql = f"""
        SELECT
            (EXTRACT(EPOCH FROM time_bucket(%(interval)s::interval, t.ts)) * 1000)::bigint AS t_ms,
            a.alert_id::int AS alert_id
        FROM {UT_TABLE} t
        CROSS JOIN LATERAL unnest(COALESCE(t.active_alerts, '{{}}'::int[])) AS a(alert_id)
        WHERE t.device_id = %(device_id)s
          AND t.ts >= %(dt_from)s
          AND t.ts <  %(dt_to)s
        GROUP BY 1, 2
        ORDER BY 1, 2;
    """
    with connection.cursor() as cur:
        cur.execute(sql, {"interval": interval, "device_id": device_id, "dt_from": dt_from, "dt_to": dt_to})
        rows = cur.fetchall()
        return [int(row[0]) for row in rows if row and row[0] is not None]
        # return [int(alert_id) for alert_id in cur.fetchall()]


def get_metadata(metadata_key: str) -> list[dict[str, Any]]:
    try:
        meta = StarlinkMetadata.objects.get(pk=metadata_key)
    except StarlinkMetadata.DoesNotExist:
        return []
    return meta.payload