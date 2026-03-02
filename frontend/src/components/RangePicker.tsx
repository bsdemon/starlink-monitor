// components/RangePicker.tsx
import { useMemo } from "react";

export type RangePreset =
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "3h"
  | "6h"
  | "12h"
  | "24h";

type Props = {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
};

export function RangePicker({ value, onChange }: Props) {
  const options = useMemo(
    () => [
      { value: "5m", label: "Last 5 min" },
      { value: "15m", label: "Last 15 min" },
      { value: "30m", label: "Last 30 min" },
      { value: "1h", label: "Last 1 hour" },
      { value: "3h", label: "Last 3 h" },
      { value: "6h", label: "Last 6 h" },
      { value: "12h", label: "Last 12 h" },
      { value: "24h", label: "Last 24 h" },
    ],
    []
  );

  return (
    <div className="rangePicker">
      <label className="rangeLabel">Range:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RangePreset)}
        className="rangeSelect"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}