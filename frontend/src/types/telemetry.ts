export type TimeseriesPoint = [number, number | null]; 
// [unixMs, value]

export type TimeseriesResponse = {
  series: {
    downlinkMbps: TimeseriesPoint[];
  };
};