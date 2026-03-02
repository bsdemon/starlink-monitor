import { useMemo } from "react";
import uPlot from "uplot";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";

type Props = {
  points: Array<[number, number | null]>;
  height?: number;
  width?: number;
};

export function DownlinkThroughputChart({ points, width = 600, height = 300 }: Props) {
  const data = useMemo(() => {
    const sorted = [...points].sort((a, b) => a[0] - b[0]);
    const n = sorted.length;

    const x = new Float64Array(n);
    const y = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const [t, v] = sorted[i];
      x[i] = t / 1000;
      y[i] = v == null ? Number.NaN : v;
    }

    return [x, y] as unknown as uPlot.AlignedData;
  }, [points]);

  const options = useMemo<uPlot.Options>(() => {
    return {
      width,
      height,
      scales: { x: { time: true }, y: { auto: true } },
      axes: [{ scale: "x" }, { scale: "y", label: "Mbps" }],
      series: [
        {},
        {
          label: "Downlink Throughput",
          stroke: "currentColor",
          width: 2,
          // optional: show points
          // points: { show: false },
          value: (_u, v) => (Number.isFinite(v) ? `${v.toFixed(2)} Mbps` : "-"),
        },
      ],
    };
  }, [width, height]);

  return (
    <div style={{ color: "#2563eb" /* pick your theme color here */ }}>
      <UplotReact options={options} data={data} />
    </div>
  );
}