import { useCallback, useMemo, useState } from "react";
import { DevicePicker } from "../components/DevicePicker";
import type { Device } from "../api/devices";
import { LocationMapLeaflet } from "../components/LocationMapLeaflet";
import { TimeseriesSection } from "../components/TimeseriesSection";
import { useTimeseries } from "../hooks/useTimeseries";
import { useLiveRange } from "../hooks/useLiveRange";
import { DeviceAlerts } from "../components/DeviceAlerts";

type Bucket = "15s" | "1m" | "5m" | "15m" | "1h" | "1d";
type RangePreset = "5m" | "15m" | "30m" | "1h" | "3h" | "6h" | "12h" | "24h" | "30d";

const WINDOW_BY_PRESET: Record<RangePreset, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const BUCKET_BY_PRESET: Record<RangePreset, Bucket> = {
  "5m": "15s",
  "15m": "15s",
  "30m": "15s",
  "1h": "15s",
  "3h": "15s",
  "6h": "15s",
  "12h": "15s",
  "24h": "15s", 
  "30d": "1h", 
};

function RangePicker({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}) {
  return (
    <div className="picker">
      <label className="pickerLabel">Range:</label>
      <div className="selectWrap">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RangePreset)}
        className="select"
      >
        <option value="5m">Last 5 min</option>
        <option value="15m">Last 15 min</option>
        <option value="30m">Last 30 min</option>
        <option value="1h">Last 1 hour</option>
        <option value="3h">Last 3 h</option>
        <option value="6h">Last 6 h</option>
        <option value="12h">Last 12 h</option>
        <option value="24h">Last 24 h</option>
        <option value="30d">Last 30 days</option>
      </select>
      <span className="selectArrow">▾</span>
      </div>
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


      <div className="topRow">
        <div className="chartCard">
          <DevicePicker selectedId={selectedId} onSelect={onSelect} />

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <RangePicker value={preset} onChange={setPreset} />
          </div>
          <div className="bucketPill" title="Bucket is tied to selected range">
            bucket: {bucket}
          </div>
          <h3 className="chartCard__title">Selected device</h3>

          <div className="DCard">
            <div>
              <strong>Device ID:</strong> {selected?.deviceId ?? "—"}
            </div>
            <div>
              <strong>Name:</strong> {selected?.info?.nickname ?? "—"}
            </div>
            <div>
              <strong>IP:</strong> {selected?.ipv4 ?? "—"}
            </div>
            <div>
              <strong>IPv6:</strong> {selected?.ipv6 ?? "—"}
            </div>
            <div>
              <strong>Subscription ID:</strong> {selected?.info?.subscriptionId ?? "—"}
            </div>
            <div>
              <strong>KIT serial number:</strong> {selected?.info?.kitSerialNumberId ?? "—"}
            </div>
            <div>
              <strong>Dish serial number:</strong> {selected?.info?.dishSerialNumberId ?? "—"}
            </div>
            <div>
              <strong>Router serial number:</strong> {selected?.info?.routerId ?? "—"}
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
              label={selected?.info?.nickname ?? selected?.deviceId ?? "Device"}
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