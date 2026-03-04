import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";
import { alignedDataFromMsPoints, withTimeRangeX, type IsoRange } from "./uPlotTime";

type Props = {
  points: Array<[number, number | null]>;
  range: IsoRange;
  height?: number;
};

export function ObstructionPercentTimeChart({
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
        y: { auto: false, range: () => [0, 100] },
      },
      axes: [
        { scale: "x", space: 80 },
        { scale: "y", label: "Obstruction % Time" },
      ],
      series: [
        {},
        {
          label: "Obstruction % Time",
          stroke: "#0bf53e",
          width: 2,
          value: (_u, v) =>
            Number.isFinite(v) ? `${v.toFixed(1)} %` : "-",
        },
      ],
    };

    return withTimeRangeX(base, range);
  }, [range]);

  return <ResponsiveUPlot data={data} options={options} height={height} />;
}