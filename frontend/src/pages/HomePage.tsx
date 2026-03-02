import { useCallback, useMemo, useState } from "react";
import { DevicePicker } from "../components/DevicePicker";
import type { Device } from "../api/devices";
import { LocationMapLeaflet } from "../components/LocationMapLeaflet";
import { TimeseriesSection } from "../components/TimeseriesSection";
import { useTimeseries } from "../hooks/useTimeseries";
import { useLiveRange } from "../hooks/useLiveRange";
import { DeviceAlerts } from "../components/DeviceAlerts";

type Bucket = "15s" | "1m" | "5m" | "15m" | "1h" | "1d";
type RangePreset = "5m" | "15m" | "30m" | "1h" | "3h" | "6h" | "12h" | "24h";

const WINDOW_BY_PRESET: Record<RangePreset, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

const BUCKET_BY_PRESET: Record<RangePreset, Bucket> = {
  "5m": "15s",
  "15m": "15s",
  "30m": "15s",
  "1h": "15s",
  "3h": "15s",
  "6h": "15s",
  "12h": "15s",
  "24h": "15s", // change to "1h" if you want more points
};

function RangePicker({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}) {
  return (
    <div className="rangePicker">
      <label className="rangeLabel">Range:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RangePreset)}
        className="rangeSelect"
      >
        <option value="5m">Last 5 min</option>
        <option value="15m">Last 15 min</option>
        <option value="30m">Last 30 min</option>
        <option value="1h">Last 1 hour</option>
        <option value="3h">Last 3 h</option>
        <option value="6h">Last 6 h</option>
        <option value="12h">Last 12 h</option>
        <option value="24h">Last 24 h</option>
      </select>
    </div>
  );
}

export function HomePage() {
  const [selected, setSelected] = useState<Device | null>(null);
  const selectedId = selected?.deviceId ?? null;

  const [preset, setPreset] = useState<RangePreset>("6h");

  // ✅ bucket is now derived (no user control)
  const bucket = BUCKET_BY_PRESET[preset];

  const range = useLiveRange({
    enabled: Boolean(selectedId),
    windowMs: WINDOW_BY_PRESET[preset],
    tickMs: 15_000,
  });

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

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <RangePicker value={preset} onChange={setPreset} />
        <div className="bucketPill" title="Bucket is tied to selected range">
          bucket: {bucket}
        </div>
      </div>

      <div className="topRow">
        <div className="chartCard">
          <h3 className="chartCard__title">Selected device</h3>

          <div className="DCard">
            <div>
              <strong>Device ID:</strong> {selected?.deviceId ?? "—"}
            </div>
            <div>
              <strong>Name:</strong> {selected?.name ?? "—"}
            </div>
            <div>
              <strong>IP:</strong> {selected?.ipv4 ?? "—"}
            </div>
            <div>
              <strong>IPv6:</strong> {selected?.ipv6 ?? "—"}
            </div>
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