import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";

type Props = {
  points: Array<[number, number | null]>;
  height?: number;
};

export function PacketLossChart({ points, height = 300 }: Props) {
  const data = useMemo(() => {
    const sorted = [...points].sort((a, b) => a[0] - b[0]);
    const n = sorted.length;

    const x = new Float64Array(n);
    const y = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const [t, v] = sorted[i];
      x[i] = t / 1000;
      // PingDropRateAvg is usually ratio (0..1). Keep as-is for axis; format as %
      y[i] = v == null ? Number.NaN : v;
    }

    return [x, y] as unknown as uPlot.AlignedData;
  }, [points]);

  const options = useMemo<Omit<uPlot.Options, "width" | "height">>(() => {
    return {
      scales: {
        x: { time: true },
        // lock to 0..1 so it's readable even when values are tiny
        y: { auto: false, range: () => [0, 1] },
      },
      axes: [
        { scale: "x" },
        {
          scale: "y",
          label: "Packet loss (%)",
          values: (_u, vals) => vals.map((v) => `${Math.round(v * 100)}%`),
        },
      ],
      series: [
        {},
        {
          label: "Packet loss",
          stroke: "#ef4444",
          width: 2,
          value: (_u, v) =>
            Number.isFinite(v) ? `${(v * 100).toFixed(2)}%` : "-",
        },
      ],
    };
  }, []);

  return <ResponsiveUPlot data={data} options={options} height={height} />;
}