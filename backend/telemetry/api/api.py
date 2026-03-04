from ninja import NinjaAPI, Router

from .schemas import DevicesOut, SummaryOut, TimeseriesOut
from .service import (
    get_devices,
    get_summary,
    get_timeseries,
)

api = NinjaAPI(title="Starlink UT API")
router = Router(tags=["ut"])

@api.get("/health")
def health_check(request):
    return {"status": "ok"}

@router.get("/ut/devices", response=DevicesOut)
def list_devices(request):
    return {"devices": get_devices()}


@router.get("/ut/devices/{device_id}/summary", response=SummaryOut)
def summary(request, device_id: str, day: str):
    return get_summary(device_id, day)


@router.get("/ut/devices/{device_id}/timeseries", response=TimeseriesOut)
def timeseries(
    request,
    device_id: str,
    from_: str,
    to: str,
    bucket: str,
    metrics: str | None = None,
):
    return get_timeseries(device_id, from_, to, bucket, metrics)


api.add_router("", router)