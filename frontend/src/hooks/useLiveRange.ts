// src/hooks/useLiveRange.ts

import { useEffect, useState } from "react";

export function useLiveRange(opts: {
  enabled: boolean;
  windowMs: number;     // e.g. 6h
  tickMs: number;       // e.g. 15s
}) {
  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const now = Date.now();
    return {
      from: new Date(now - opts.windowMs).toISOString(),
      to: new Date(now).toISOString(),
    };
  });

  // Reset when enabled toggles on (e.g. device selected)
  useEffect(() => {
    if (!opts.enabled) return;
    const now = Date.now();
    setRange({
      from: new Date(now - opts.windowMs).toISOString(),
      to: new Date(now).toISOString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled]);

  // Advance "to"
  useEffect(() => {
    if (!opts.enabled) return;
    const id = window.setInterval(() => {
      setRange((r) => ({ ...r, to: new Date().toISOString() }));
    }, opts.tickMs);
    return () => window.clearInterval(id);
  }, [opts.enabled, opts.tickMs]);

  return range;
}