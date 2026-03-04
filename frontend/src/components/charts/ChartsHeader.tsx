type Props = {
  title: string;
  fromISO: string;
  toISO: string;
  bucket: string;
  keys: string[];
};

export function ChartHeader({ title, fromISO, toISO, bucket, keys }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Range: {fromISO} → {toISO} | bucket: {bucket}
      </div>

      <div style={{ fontSize: 12, opacity: 0.6 }}>
        series keys: {keys.join(", ")}
      </div>
    </div>
  );
}