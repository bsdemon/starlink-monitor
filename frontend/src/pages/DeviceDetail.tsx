import { ChartHeader } from "../components/charts/ChartsHeader";
import { MultiSeriesChart } from "../components/charts/MultiSeriesChart";
import type { SeriesMap } from "../components/charts/toUPlotAligned";

type TimeseriesResponse = {
  series: SeriesMap;
};

type Props = {
  resp: TimeseriesResponse;
  from: string;
  to: string;
  bucket: string;
};

export function DeviceDetailsPage({ resp, from, to, bucket }: Props) {
  const allKeys = Object.keys(resp.series);

  return (
    <div style={{ padding: 20 }}>

      <ChartHeader
        title="Device telemetry"
        fromISO={from}
        toISO={to}
        bucket={bucket}
        keys={allKeys}
      />

      {/* Throughput */}
      <MultiSeriesChart
        title="Throughput"
        yLabel="Mbps"
        seriesMap={resp.series}
        keys={["downlinkMbps", "uplinkMbps"]}
      />

      {/* Ping latency */}
      <MultiSeriesChart
        title="Ping latency"
        yLabel="ms"
        seriesMap={resp.series}
        keys={["pingLatencyMsAvg"]}
      />

      {/* Signal quality */}
      <MultiSeriesChart
        title="Signal quality"
        yLabel="ratio"
        seriesMap={resp.series}
        keys={["signalQuality"]}
      />

    </div>
  );
}