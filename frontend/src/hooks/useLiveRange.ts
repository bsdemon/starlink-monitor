import { useEffect, useState } from "react";

type Range = { from: string; to: string };

function makeRange(windowMs: number): Range {
  const toMs = Date.now();
  const fromMs = toMs - windowMs;
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
}

export function useLiveRange(opts: {
  enabled: boolean;
  windowMs: number;
  tickMs: number;
}): Range {
  const { enabled, windowMs, tickMs } = opts;

  const [range, setRange] = useState<Range>(() => makeRange(windowMs));

  // ✅ Recompute immediately when enabled/windowMs changes
  useEffect(() => {
    if (!enabled) return;
    setRange(makeRange(windowMs));
  }, [enabled, windowMs]);

  // ✅ Keep "to" moving
  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      setRange(makeRange(windowMs));
    }, tickMs);

    return () => window.clearInterval(id);
  }, [enabled, windowMs, tickMs]);

  return range;
}