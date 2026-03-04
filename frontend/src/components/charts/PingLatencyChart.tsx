import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";
import { alignedDataFromMsPoints, withTimeRangeX, type IsoRange } from "./uPlotTime";

type Props = {
  points: Array<[number, number | null]>;
  range: IsoRange
  height?: number;
};

export function PingLatencyChart({ points, range, height = 300 }: Props) {
  const data = useMemo(() => {
    return alignedDataFromMsPoints(points);
  }, [points]);

  const options = useMemo<Omit<uPlot.Options, "width" | "height">>(() => {
    const base: Omit<uPlot.Options, "width" | "height"> = {
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        { scale: "x", space:80 }, // values ще се override-не от withTimeRangeX
        { scale: "y", label: "Latency (ms)" },
      ],
      series: [
        {},
        {
          label: "Ping latency",
          stroke: "#f59e0b",
          width: 2,
          value: (_u, v) => (Number.isFinite(v) ? `${v.toFixed(1)} ms` : "-"),
        },
      ],
    };

    return withTimeRangeX(base, range);
  }, [range]);

  return <ResponsiveUPlot data={data} options={options} height={height} />;
}
  
// export function PingLatencyChart({
//   points,
//   height = 300,
// }: Props) {
//   const data = useMemo(() => {
//     const sorted = [...points].sort((a, b) => a[0] - b[0]);
//     const n = sorted.length;

//     const x = new Float64Array(n);
//     const y = new Float64Array(n);

//     for (let i = 0; i < n; i++) {
//       const [t, v] = sorted[i];
//       x[i] = t / 1000;
//       y[i] = v == null ? Number.NaN : v;
//     }

//     return [x, y] as unknown as uPlot.AlignedData;
//   }, [points]);

//   const options = useMemo<Omit<uPlot.Options, "width" | "height">>(() => {
//     return {
//       scales: {
//         x: { time: true },
//         y: { auto: true },
//       },
//       axes: [
//         { scale: "x" },
//         { scale: "y", label: "Latency (ms)" },
//       ],
//       series: [
//         {},
//         {
//           label: "Ping latency",
//           stroke: "#f59e0b",
//           width: 2,
//           value: (_u, v) =>
//             Number.isFinite(v) ? `${v.toFixed(1)} ms` : "-",
//         },
//       ],
//     };
//   }, []);

//   return <ResponsiveUPlot data={data} options={options} height={height} />;
// }