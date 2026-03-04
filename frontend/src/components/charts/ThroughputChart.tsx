import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";
import { withTimeRangeX, type IsoRange } from "./uPlotTime";

type Props = {
  downlink: Array<[number, number | null]>;
  uplink: Array<[number, number | null]>;
  range: IsoRange
  height?: number;
};

export function ThroughputChart({
  downlink,
  uplink,
  range,
  height = 340,
}: Props) {
  const data = useMemo(() => {
    // 1) Build maps by timestamp (ms)
    const dlMap = new Map<number, number | null>();
    for (const [t, v] of downlink) dlMap.set(t, v);

    const ulMap = new Map<number, number | null>();
    for (const [t, v] of uplink) ulMap.set(t, v);

    // 2) Union timestamps, sorted
    const tsSet = new Set<number>();
    for (const [t] of downlink) tsSet.add(t);
    for (const [t] of uplink) tsSet.add(t);

    const ts = Array.from(tsSet).sort((a, b) => a - b);
    const n = ts.length;

    const x = new Float64Array(n);
    const dl = new Float64Array(n);
    const ul = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const tMs = ts[i];
      x[i] = tMs / 1000; // ✅ uPlot time: seconds

      const dv = dlMap.get(tMs);
      const uv = ulMap.get(tMs);

      dl[i] = dv == null ? Number.NaN : dv;
      ul[i] = uv == null ? Number.NaN : uv;
    }

    return [x, dl, ul] as unknown as uPlot.AlignedData;
  }, [downlink, uplink]);

  const options = useMemo<Omit<uPlot.Options, "width" | "height">>(() => {
    const base: Omit<uPlot.Options, "width" | "height"> = {
      scales: {
        x: { time: true },
        y: { auto: true },  // Download
        y2: { auto: true }, // Upload
      },

      axes: [
        { scale: "x", space: 80 }, // ✅ less overlap
        { scale: "y", label: "Download (Mbps)" },
        { scale: "y2", label: "Upload (Mbps)", side: 1 },
      ],

      series: [
        {},
        {
          label: "Download",
          stroke: "#2563eb",
          width: 2,
          scale: "y",
        },
        {
          label: "Upload",
          stroke: "#16a34a",
          width: 2,
          scale: "y2",
        },
      ],
    };

    // ✅ Force X min/max + adaptive tick formatting for 30m/1h/24h/30d
    return withTimeRangeX(base, range);
  }, [range]);
  return <ResponsiveUPlot data={data} options={options} height={height} />;
}