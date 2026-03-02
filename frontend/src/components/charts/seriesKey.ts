// src/components/charts/seriesKey.ts

export type SeriesMap = Record<string, Array<[number, number | null]>>;

const KEY_ALIASES: Record<string, string[]> = {
  downlinkMbps: ["downlinkMbps", "downlink_throughput_mbps", "DownlinkThroughput"],
  uplinkMbps: ["uplinkMbps", "uplink_throughput_mbps", "UplinkThroughput"],
  pingLatencyMsAvg: ["pingLatencyMsAvg", "ping_latency_ms_avg", "PingLatencyMsAvg"],
  pingDropRateAvg: ["pingDropRateAvg", "ping_drop_rate_avg", "PingDropRateAvg"],
  obstructionPercentTime: ["obstructionPercentTime", "obstruction_percent_time", "ObstructionPercentTime"],
  signalQuality: ["signalQuality", "signal_quality", "SignalQuality"],
};

export function pickSeries(series: SeriesMap | undefined | null, canonicalKey: keyof typeof KEY_ALIASES) {
  if (!series) return [];
  for (const k of KEY_ALIASES[canonicalKey]) {
    const v = series[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export function listSeriesKeys(series: SeriesMap | undefined | null) {
  return Object.keys(series ?? {});
}