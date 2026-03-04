import uPlot from "uplot";

type Point = [number, number | null];
export type SeriesMap = Record<string, Point[]>;

export function toUPlotAligned(seriesMap: SeriesMap, keys: string[]) {
  const tsSet = new Set<number>();

  for (const k of keys) {
    for (const [t] of seriesMap[k] ?? []) {
      tsSet.add(t);
    }
  }

  const tsMs = Array.from(tsSet).sort((a, b) => a - b);
  const n = tsMs.length;

  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = tsMs[i] / 1000; // uPlot expects seconds
  }

  const ys = keys.map((k) => {
    const lookup = new Map<number, number | null>();
    for (const [t, v] of seriesMap[k] ?? []) {
      lookup.set(t, v);
    }

    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const v = lookup.get(tsMs[i]);
      y[i] = v == null ? Number.NaN : v;
    }

    return y;
  });

  return [x, ...ys] as unknown as uPlot.AlignedData;
}