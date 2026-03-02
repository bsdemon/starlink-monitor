// src/components/TimeseriesSection.tsx

import { useMemo } from "react";
import { DownlinkThroughputChart } from "./charts/DownLinkThroughputChart";
import { listSeriesKeys, pickSeries } from "./charts/seriesKey";

type TimeseriesResponse = {
  series: Record<string, Array<[number, number | null]>>;
};

type Props = {
  selectedId: string | null;
  range: { from: string; to: string };
  bucket: string;
  tsData: TimeseriesResponse | null;
  tsError: string | null;
  debug?: boolean;
};

export function TimeseriesSection({
  selectedId,
  range,
  bucket,
  tsData,
  tsError,
  debug = false,
}: Props) {
  const keys = useMemo(() => listSeriesKeys(tsData?.series), [tsData]);
  const downlinkPoints = useMemo(() => pickSeries(tsData?.series, "downlinkMbps"), [tsData]);

  return (
    <div style={{ marginTop: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Downlink throughput</h2>

      {!selectedId && <div style={{ opacity: 0.7 }}>Select a device to load timeseries.</div>}

      {selectedId && (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Range: {range.from} → {range.to} | bucket: {bucket}
        </div>
      )}

      {selectedId && tsError && <div style={{ color: "crimson" }}>Timeseries error: {tsError}</div>}

      {selectedId && !tsData && !tsError && <div>Loading timeseries…</div>}

      {selectedId && tsData && (
        <>
          {debug && (
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
              series keys: {keys.join(", ") || "—"}
            </div>
          )}

          {downlinkPoints.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No downlink points for the selected range.</div>
          ) : (
            <DownlinkThroughputChart points={downlinkPoints} />
          )}
        </>
      )}
    </div>
  );
}