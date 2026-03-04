import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";
import { alignedDataFromMsPoints, withTimeRangeX, type IsoRange } from "./uPlotTime";

type Props = {
  points: Array<[number, number | null]>;
    range: IsoRange;
    height?: number;
};

export function SignalQualityChart({
  points,
  range,
  height = 300,
}: Props) {
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
        { scale: "x", space: 80 },
        { scale: "y", label: "Signal Quality dB" },
      ],
      series: [
        {},
        {
          label: "Signal Quality",
          stroke: "#3b52e4",
          width: 2,
          value: (_u, v) =>
            Number.isFinite(v) ? `${v.toFixed(1)} / 10` : "-",
        },
      ],
    };

    return withTimeRangeX(base, range);
  }, [range]);

  return <ResponsiveUPlot data={data} options={options} height={height} />;
}