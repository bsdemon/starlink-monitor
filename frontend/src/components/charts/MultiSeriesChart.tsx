import { useMemo } from "react";
import uPlot from "uplot";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";

import { toUPlotAligned, SeriesMap } from "./toUPlotAligned";

type Props = {
  seriesMap: SeriesMap;
  keys: string[];
  title: string;
  yLabel: string;
  width?: number;
  height?: number;
};

export function MultiSeriesChart({
  seriesMap,
  keys,
  title,
  yLabel,
  width = 900,
  height = 300,
}: Props) {
  const data = useMemo(
    () => toUPlotAligned(seriesMap, keys),
    [seriesMap, keys]
  );

  const options = useMemo<uPlot.Options>(() => {
    return {
      width,
      height,
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        { scale: "x" },
        { scale: "y", label: yLabel },
      ],
      series: [
        {}, // x axis
        ...keys.map((k, i) => ({
          label: k,
          stroke: i === 0 ? "#2563eb" : "#16a34a",
          width: 2,
          value: (_u, v) =>
            Number.isFinite(v) ? `${v.toFixed(2)} ${yLabel}` : "-",
        })),
      ],
    };
  }, [width, height, keys, yLabel]);

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <UplotReact options={options} data={data} />
    </div>
  );
}