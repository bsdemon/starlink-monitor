import { useCallback, useMemo, useState } from "react";
import { DevicePicker } from "../components/DevicePicker";
import type { Device } from "../api/devices";
import { LocationMapLeaflet } from "../components/LocationMapLeaflet";
import { TimeseriesSection } from "../components/TimeseriesSection";
import { useTimeseries } from "../hooks/useTimeseries";
import { useLiveRange } from "../hooks/useLiveRange";
import { DeviceAlerts } from "../components/DeviceAlerts";

export function HomePage() {
  const [selected, setSelected] = useState<Device | null>(null);
  const selectedId = selected?.deviceId ?? null;

  const range = useLiveRange({
    enabled: Boolean(selectedId),
    windowMs: 6 * 60 * 60 * 1000, // last 6h
    tickMs: 15_000,
  });

  const bucket = "1m";

  const { data: tsData, error: tsError } = useTimeseries({
    deviceId: selectedId,
    from: range.from,
    to: range.to,
    bucket,
  });


  const onSelect = useCallback((device: Device) => setSelected(device), []);

  const loc = useMemo(() => selected?.location ?? null, [selected]);

  return (
    <div className="home">

      <DevicePicker selectedId={selectedId} onSelect={onSelect} />

      <div className="topRow">

        <div className="chartCard">
          <h3 className="chartCard__title">Selected device</h3>

          <div className="DCard">
            <div><strong>Device ID:</strong> {selected?.deviceId ?? "—"}</div>
            <div><strong>Name:</strong> {selected?.name ?? "—"}</div>
          </div>
          <DeviceAlerts alerts={tsData?.events?.alerts ?? undefined} />
        </div>

        {loc && (
          <div className="chartCard">
            <h3 className="chartCard__title">Location Map</h3>
            <LocationMapLeaflet
              lat={loc.lat}
              lon={loc.lon}
              label={selected?.name ?? selected?.deviceId ?? "Device"}
            />
          </div>
        )}
      </div>

      <div className="chartGrid">
          <div className="charts">
            <TimeseriesSection
              selectedId={selectedId}
              range={range}
              bucket={bucket}
              tsData={tsData}
              tsError={tsError}
              debug={false}
            />
          </div>
      </div>
    </div>
  );
}