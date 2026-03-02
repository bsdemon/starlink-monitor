import { useMemo } from "react";
import { ThroughputChart } from "./charts/ThroughputChart";
import { listSeriesKeys, pickSeries } from "./charts/seriesKey";
import { PingLatencyChart } from "./charts/PingLatencyChart";
import { PacketLossChart } from "./charts/PacketLossChart";
import { ObstructionPercentTimeChart } from "./charts/ObstructionPercentTime";
import { SignalQualityChart } from "./charts/SignalQualityCahrt";

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

  const downlinkPoints = useMemo(
    () => pickSeries(tsData?.series, "downlinkMbps"),
    [tsData]
  );

  const uplinkPoints = useMemo(
    () => pickSeries(tsData?.series, "uplinkMbps"),
    [tsData]
  );

  const pingLatencyPoints = useMemo(
    () => pickSeries(tsData?.series, "pingLatencyMsAvg"),
    [tsData]
  );

  const pingDropRatePoints = useMemo(
    () => pickSeries(tsData?.series, "pingDropRateAvg"),
    [tsData]
  );

  const obstructionPercentTimePoints = useMemo(
    () => {
      return pickSeries(tsData?.series, "obstructionPercentTime");
    },
    [tsData]
  );

  // const signalQualityPoints = useMemo(
  //   () => {
  //     return pickSeries(tsData?.series, "signalQuality");
  //   },
  //   [tsData]
  // );

  const signalQualityPoints = useMemo(() => {
    const pts = pickSeries(tsData?.series, "signalQuality");

    return pts.map(([t, v]) => [
      t,
      v == null ? null : Math.max(0, Math.min(10, v * 10)),
    ]);
  }, [tsData]);

  if (!selectedId) {
    return <div style={{ opacity: 0.7 }}>Select a device to load timeseries.</div>;
  }

  if (tsError) {
    return <div style={{ color: "crimson" }}>Timeseries error: {tsError}</div>;
  }

  if (!tsData) {
    return <div>Loading timeseries…</div>;
  }

  return (
    <>
      {/* THROUGHPUT - WIDE */}
      <div className="chartCard chartCard--wide">
        <div className="chartCard__title">Throughput (Download / Upload)</div>

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          Range: {range.from} → {range.to} | bucket: {bucket}
        </div>

        {debug && (
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
            series keys: {keys.join(", ") || "—"}
          </div>
        )}

        <ThroughputChart downlink={downlinkPoints} uplink={uplinkPoints} />
      </div>

      {/* PING LATENCY */}
      <div className="chartCard">
        <div className="chartCard__title">Ping latency</div>
        {pingLatencyPoints.length === 0 ? (
          <div style={{ opacity: 0.6 }}>No ping latency data.</div>
        ) : (
          <PingLatencyChart points={pingLatencyPoints} />
        )}
      </div>

      {/* PACKET LOSS */}
      <div className="chartCard">
        <div className="chartCard__title">Packet loss</div>
        {pingDropRatePoints.length === 0 ? (
          <div style={{ opacity: 0.6 }}>No packet loss data.</div>
        ) : (
          <PacketLossChart points={pingDropRatePoints} />
        )}
      </div>

      {/* OBSTRUCTION */}
      <div className="chartCard">
        <div className="chartCard__title">Obstruction</div>
        {obstructionPercentTimePoints.length === 0 ? (
          <div style={{ opacity: 0.6 }}>No obstruction data.</div>
        ) : (
            <ObstructionPercentTimeChart points={obstructionPercentTimePoints} />
        )}
      </div>

      {/* SIGNAL QUALITY */}
      <div className="chartCard">
        <div className="chartCard__title">Signal Quality</div>
        {signalQualityPoints.length === 0 ? (
          <div style={{ opacity: 0.6 }}>No signal quality data.</div>
        ) : (
            <SignalQualityChart points={signalQualityPoints} />
        )}
      </div>
    </>
  );
}