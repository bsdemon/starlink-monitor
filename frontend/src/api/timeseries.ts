import type { TimeseriesResponse } from "../types/telemetry";

export async function fetchDownlinkTimeseries(
  deviceId: string,
  from: string,
  to: string,
  bucket: string
): Promise<TimeseriesResponse> {
  const params = new URLSearchParams({ from, to, bucket });

  const res = await fetch(
    `/api/ut/devices/${deviceId}/timeseries?${params}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch timeseries");
  }

  return res.json();
}