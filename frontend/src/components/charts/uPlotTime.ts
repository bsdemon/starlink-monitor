import uPlot from "uplot";

export type IsoRange = { from: string; to: string };

export function rangeToSec(range: IsoRange) {
  const fromSec = Math.floor(new Date(range.from).getTime() / 1000);
  const toSec = Math.floor(new Date(range.to).getTime() / 1000);
  return { fromSec, toSec, windowSec: Math.max(0, toSec - fromSec) };
}

export function alignedDataFromMsPoints(
  points: Array<[number, number | null]>
): uPlot.AlignedData {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const n = sorted.length;

  const x = new Float64Array(n);
  const y = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const [tMs, v] = sorted[i];
    x[i] = tMs / 1000; // ✅ uPlot time expects seconds
    y[i] = v == null ? Number.NaN : v;
  }

  return [x, y] as unknown as uPlot.AlignedData;
}

function makeXValues(windowSec: number) {
  return (_u: uPlot, ticks: number[]) =>
    ticks.map((tSec) => {
      const d = new Date(tSec * 1000);

      if (windowSec <= 60 * 60) {
        return d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }

      if (windowSec <= 24 * 60 * 60) {
        return d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      if (windowSec <= 14 * 24 * 60 * 60) {
        return d.toLocaleDateString(undefined, {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
      }

      return d.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      });
    });
}

export function withTimeRangeX(
  base: Omit<uPlot.Options, "width" | "height">,
  range: IsoRange
): Omit<uPlot.Options, "width" | "height"> {
  const { fromSec, toSec, windowSec } = rangeToSec(range);

  return {
    ...base,
    scales: {
      ...(base.scales ?? {}),
      x: {
        ...((base.scales?.x as any) ?? {}),
        time: true,
        min: fromSec,
        max: toSec,
      },
    },
    axes: base.axes
      ? base.axes.map((ax, idx) =>
          idx === 0 ? { ...ax, values: makeXValues(windowSec) } : ax
        )
      : [{ values: makeXValues(windowSec) }, {}],
  };
}