import { useEffect, useState } from "react";
import { fetchDevices, type Device } from "../api/devices";

type Props = {
  onSelect: (device: Device) => void;
  selectedId?: string | null;
};

export function DevicePicker({ onSelect, selectedId }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchDevices();
        if (cancelled) return;

        setDevices(data);

        // Auto-select first device when nothing is selected
        if (!selectedId && data.length > 0) onSelect(data[0]);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId, onSelect]);

  if (loading) return <div className="muted">Loading devices…</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (devices.length === 0) return <div className="muted">No devices found.</div>;

  return (
    <div className="picker">
      <label className="pickerLabel" htmlFor="device">
        Device
      </label>

      <div className="selectWrap">
        <select
          id="device"
          className="select"
          value={selectedId ?? devices[0]?.deviceId ?? ""}
          onChange={(e) => {
            const dev = devices.find((d) => d.deviceId === e.target.value);
            if (dev) onSelect(dev);
          }}
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.name ? `${d.name} (${d.deviceId})` : d.deviceId}
            </option>
          ))}
        </select>
        <span className="selectArrow">▾</span>
      </div>
    </div>
  );
}
