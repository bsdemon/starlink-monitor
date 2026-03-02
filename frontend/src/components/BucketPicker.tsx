// components/BucketPicker.tsx
import { useMemo } from "react";

type Bucket = "15s" | "1m" | "5m" | "15m" | "1h" | "1d";

type Props = {
  value: Bucket;
  onChange: (bucket: Bucket) => void;
};

export function BucketPicker({ value, onChange }: Props) {
  const options = useMemo(
    () => [
      { value: "15s", label: "15 seconds" },
      { value: "1m", label: "1 minute" },
      { value: "5m", label: "5 minutes" },
      { value: "15m", label: "15 minutes" },
      { value: "1h", label: "1 hour" },
      { value: "1d", label: "1 day" },
    ],
    []
  );

  return (
    <div className="picker">
      <label className="pickerLabel">Resolution:</label>
      <div className="selectWrap">

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Bucket)}
        className="select"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      </div>
    </div>
  );
}