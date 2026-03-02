import { useMemo } from "react";
import uPlot from "uplot";
import { ResponsiveUPlot } from "./ResponsiveUPlot";

type Props = {
  downlink: Array<[number, number | null]>;
  uplink: Array<[number, number | null]>;
  height?: number;
};

export function ThroughputChart({
  downlink,
  uplink,
  height = 340,
}: Props) {
  const data = useMemo(() => {
    const n = Math.max(downlink.length, uplink.length);

    const x = new Float64Array(n);
    const dl = new Float64Array(n);
    const ul = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const d = downlink[i];
      const u = uplink[i];

      const ts = d?.[0] ?? u?.[0] ?? 0;

      x[i] = ts / 1000;
      dl[i] = d?.[1] == null ? Number.NaN : d[1];
      ul[i] = u?.[1] == null ? Number.NaN : u[1];
    }

    return [x, dl, ul] as unknown as uPlot.AlignedData;
  }, [downlink, uplink]);

const options = useMemo<Omit<uPlot.Options, "width" | "height">>(() => {
  return {
    scales: {
      x: { time: true },
      y: { auto: true },       // Download scale
      y2: { auto: true },      // Upload scale
    },

    axes: [
      { scale: "x" },
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
}, []);

  return <ResponsiveUPlot data={data} options={options} height={height} />;
}