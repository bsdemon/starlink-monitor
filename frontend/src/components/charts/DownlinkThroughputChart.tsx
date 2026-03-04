import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";

type Props = {
  points: Array<[number, number | null]>;
  height?: number;
};

export function DownlinkThroughputChart({ points, height = 320 }: Props) {
  const data = useMemo(() => {
    const sorted = [...points].sort((a, b) => a[0] - b[0]);
    const n = sorted.length;

    const x = new Float64Array(n);
    const y = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const [t, v] = sorted[i];
      x[i] = t / 1000; // uPlot expects seconds for time scale
      y[i] = v == null ? Number.NaN : v;
    }

    return [x, y] as unknown as uPlot.AlignedData;
  }, [points]);

  const options = useMemo<Omit<uPlot.Options, "width" | "height">>(() => {
    return {
      scales: { x: { time: true }, y: { auto: true } },
      axes: [{ scale: "x" }, { scale: "y", label: "Mbps" }],
      series: [
        {},
        {
          label: "Downlink Throughput",
          stroke: "#2563eb",
          width: 2,
          value: (_u, v) => (Number.isFinite(v) ? `${v.toFixed(2)} Mbps` : "-"),
        },
      ],
    };
  }, []);

  return <ResponsiveUPlot data={data} options={options} height={height} />;
}