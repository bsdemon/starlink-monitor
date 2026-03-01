from __future__ import annotations

from typing import Any

from ninja import Schema
from pydantic import ConfigDict, Field


class LocationOut(Schema):
    lat: float | None = None
    lon: float | None = None
    h3CellId: int | None = None


class DeviceOut(Schema):
    deviceId: str
    name: str
    location: LocationOut


class DevicesOut(Schema):
    devices: list[DeviceOut]


class RangeOut(Schema):
    from_: str = Field(alias="from")  # ISO
    to: str  # ISO

    # Pydantic v2: allow both field name (from_) and alias ("from") during validation/serialization
    model_config = ConfigDict(populate_by_name=True)


class StatTriple(Schema):
    min: float | None = None
    avg: float | None = None
    max: float | None = None


class SnapshotOut(Schema):
    ts: str  # ISO UTC
    downlinkMbps: float | None = None
    uplinkMbps: float | None = None
    pingLatencyMsAvg: float | None = None
    pingDropRateAvg: float | None = None
    obstructionPercentTime: float | None = None
    signalQuality: float | None = None
    uptimeS: int | None = None
    runningSoftwareVersion: str | None = None
    secondsUntilSwupdateRebootPossible: int | None = None


class AlertsOut(Schema):
    active: list[int]
    countsByAlertId: dict[str, int]


class DayStatsOut(Schema):
    range: RangeOut
    downlinkMbps: StatTriple
    uplinkMbps: StatTriple
    pingLatencyMsAvg: StatTriple
    pingDropRateAvg: StatTriple
    obstructionPercentTime: StatTriple
    signalQuality: StatTriple


class SummaryOut(Schema):
    device: DeviceOut
    snapshot: SnapshotOut | None
    dayStats: DayStatsOut | None
    alerts: AlertsOut


class DaysOut(Schema):
    days: list[str]  # YYYY-MM-DD


class TimeseriesOut(Schema):
    bucket: str
    from_: str = Field(alias="from")
    to: str
    series: dict[str, list[list[int | float | None]]]

    # events.alerts = [[ms, alertId], ...]
    events: dict[str, Any] | None = None

    model_config = ConfigDict(populate_by_name=True)