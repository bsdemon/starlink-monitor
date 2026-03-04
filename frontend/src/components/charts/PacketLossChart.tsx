import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";
import { alignedDataFromMsPoints, withTimeRangeX, type IsoRange } from "./uPlotTime";

type Props = {
  points: Array<[number, number | null]>;
  range: IsoRange
  height?: number;
};

export function PacketLossChart({ points, range, height = 300 }: Props) {
  const data = useMemo(() => {
    return alignedDataFromMsPoints(points);
  }, [points]);

  const options = useMemo<Omit<uPlot.Options, "width" | "height">>(() => {
    const base: Omit<uPlot.Options, "width" | "height"> = {
      scales: {
        x: { time: true },
        // lock to 0..1 so it's readable even when values are tiny
        y: { auto: false, range: () => [0, 1] },
      },
      axes: [
        { scale: "x", space: 80 },
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
    return withTimeRangeX(base, range);
    
  }, [range]);

  return <ResponsiveUPlot data={data} options={options} height={height} />;
}