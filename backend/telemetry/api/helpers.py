from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ninja.errors import HttpError

from .constants import BUCKET_ORDER, BUCKET_TO_INTERVAL


def parse_iso_datetime(value: str) -> datetime:
    v = value.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    dt = datetime.fromisoformat(v)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def clamp_bucket(requested: str, dt_from: datetime, dt_to: datetime) -> str:
    delta = dt_to - dt_from

    if delta <= timedelta(hours=3):
        min_bucket = "15s"
    elif delta <= timedelta(hours=24):
        min_bucket = "1m"
    elif delta <= timedelta(days=3):
        min_bucket = "5m"
    elif delta <= timedelta(days=14):
        min_bucket = "15m"
    elif delta <= timedelta(days=60):
        min_bucket = "1h"
    else:
        min_bucket = "1d"

    if requested not in BUCKET_TO_INTERVAL:
        raise HttpError(400, f"Invalid bucket '{requested}'. Allowed: {list(BUCKET_TO_INTERVAL.keys())}")

    def idx(b: str) -> int:
        return BUCKET_ORDER.index(b)

    return min_bucket if idx(requested) < idx(min_bucket) else requested