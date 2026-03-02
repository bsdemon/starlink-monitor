from __future__ import annotations

from typing import Literal

Bucket = Literal["15s", "1m", "5m", "15m", "1h", "1d"]

BUCKET_TO_INTERVAL: dict[str, str] = {
    "15s": "15 seconds",
    "1m": "1 minute",
    "5m": "5 minutes",
    "15m": "15 minutes",
    "1h": "1 hour",
    "1d": "1 day",
}

BUCKET_ORDER: list[str] = ["15s", "1m", "5m", "15m", "1h", "1d"]

Metric = Literal[
    "downlinkMbps",
    "uplinkMbps",
    "pingLatencyMsAvg",
    "pingDropRateAvg",
    "obstructionPercentTime",
    "signalQuality",
    "uptimeS",
    "secondsUntilSwupdateRebootPossible",
]

METRICS_TO_SQL_COLUMN: dict[str, str] = {
    "downlinkMbps": "downlink_throughput_mbps",
    "uplinkMbps": "uplink_throughput_mbps",
    "pingLatencyMsAvg": "ping_latency_ms_avg",
    "pingDropRateAvg": "ping_drop_rate_avg",
    "obstructionPercentTime": "obstruction_percent_time",
    "signalQuality": "signal_quality",
    "uptimeS": "uptime_s",
    "secondsUntilSwupdateRebootPossible": "seconds_until_swupdate_reboot_possible",
}

UT_TABLE = "telemetry_u"
I_TABLE = "telemetry_i"