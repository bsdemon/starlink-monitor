import { useCallback, useMemo, useState } from "react";
import { DevicePicker } from "../components/DevicePicker";
import type { Device } from "../api/devices";
import { LocationMapLeaflet } from "../components/LocationMapLeaflet";
import { TimeseriesSection } from "../components/TimeseriesSection";
import { useTimeseries } from "../hooks/useTimeseries";
import { useLiveRange } from "../hooks/useLiveRange";

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
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Starlink Monitor</h1>

      <DevicePicker selectedId={selectedId} onSelect={onSelect} />

      <div style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Selected device</h2>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
          <div>
            <strong>Device ID:</strong> {selected?.deviceId ?? "—"}
          </div>
          <div>
            <strong>Name:</strong> {selected?.name ?? "—"}
          </div>
          <div>
            <strong>Location:</strong>{" "}
            {loc ? `${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)} (h3: ${loc.h3CellId})` : "—"}
          </div>
        </div>
      </div>

      {loc && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 8 }}>Location map</h2>
          <LocationMapLeaflet
            lat={loc.lat}
            lon={loc.lon}
            label={selected?.name ?? selected?.deviceId ?? "Device"}
          />
        </div>
      )}

      <TimeseriesSection
        selectedId={selectedId}
        range={range}
        bucket={bucket}
        tsData={tsData}
        tsError={tsError}
        debug={true} // сложи false когато приключим
      />
    </div>
  );
}