import { useEffect, useMemo, useState } from "react";
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
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDevices();
        if (!alive) return;

        setDevices(data);

        if (!selectedId && data.length > 0) {
          onSelect(data[0]);
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [onSelect, selectedId]);

  const options = useMemo(
    () =>
      devices.map((d) => ({
        id: d.deviceId,
        label: d.name ? `${d.name} (${d.deviceId})` : d.deviceId,
      })),
    [devices]
  );

  if (loading) return <div>Loading devices…</div>;
  if (error) return <div style={{ color: "crimson" }}>Error: {error}</div>;
  if (devices.length === 0) return <div>No devices found.</div>;

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <label htmlFor="device">Device:</label>
      <select
        id="device"
        value={selectedId ?? ""}
        onChange={(e) => {
          const dev = devices.find((d) => d.deviceId === e.target.value);
          if (dev) onSelect(dev);
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}