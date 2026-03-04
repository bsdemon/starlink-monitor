from __future__ import annotations

from typing import Any

from ninja import Schema
from pydantic import ConfigDict, Field


class LocationOut(Schema):
    lat: float | None = None
    lon: float | None = None
    h3CellId: int | None = None


class DeviceInfoOut(Schema):
    nickname: str | None = None
    subscriptionId: str | None = None
    kitSerialNumberId: str | None = None
    dishSerialNumberId: str | None = None
    routerId: str | None = None
    lastUpdated: str | None = None  # ISO


class DeviceOut(Schema):
    deviceId: str
    location: LocationOut
    info: DeviceInfoOut | None = None
    ipv4: str | None = None
    ipv6: str | None = None


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


class DayStatsOut(Schema):
    range: RangeOut
    downlinkMbps: StatTriple
    uplinkMbps: StatTriple
    pingLatencyMsAvg: StatTriple
    pingDropRateAvg: StatTriple
    obstructionPercentTime: StatTriple
    signalQuality: StatTriple
    ip: dict[str, str | None] | None = None

class AlertEvent(Schema):
    ts: int
    id: int | None = None
    code: str        

class AlertsOut(Schema):
    alerts: list[AlertEvent] = []

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

    ip: dict[str, str | None] | None = None
    events: dict[str, Any] | None = None

    model_config = ConfigDict(populate_by_name=True)


class IngestMetaOut(Schema):
    runId: str
    deviceId: str | None = None
    status: str                 # "ok" | "error"
    rowsInserted: int | None = None
    fromTs: str | None = None   # ISO
    toTs: str | None = None     # ISO
    rollbackOk: bool | None = None
    error: str | None = None