import { useEffect, useMemo, useRef, useState } from "react";

export type TimeseriesPoint = [number, number | null]; // [unixMs, value]

export type Events = {
  alerts?: Array<[number, string]>;
}
export type TimeseriesResponse = {
  series: Record<string, TimeseriesPoint[]>;
  events?: Events;
};

function safeSlice(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function useTimeseries(opts: {
  deviceId: string | null;
  from: string; // ISO
  to: string; // ISO
  bucket: string; // "1m" etc.
  pollMs?: number;
}) {
  const [data, setData] = useState<TimeseriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  const url = useMemo(() => {
    if (!opts.deviceId) return null;

    const p = new URLSearchParams({
      from_: opts.from, // IMPORTANT: backend expects from_
      to: opts.to,
      bucket: opts.bucket,
    });

    return `/api/ut/devices/${opts.deviceId}/timeseries?${p.toString()}`;
  }, [opts.deviceId, opts.from, opts.to, opts.bucket]);

  useEffect(() => {
    // Clear previous data when inputs change (optional but nice UX)
    setData(null);
    setError(null);
  }, [url]);

  useEffect(() => {
    if (!url) return;

    const currentUrl = url; // ✅ narrows to string for TS

    async function load() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(currentUrl, {
          signal: ac.signal,
          headers: { Accept: "application/json" },
        });

        const contentType = res.headers.get("content-type") ?? "";
        const text = await res.text();

        if (!res.ok) {
          throw new Error(
            `Timeseries HTTP ${res.status} (${contentType || "no content-type"}): ${safeSlice(text, 200)}`
          );
        }

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Timeseries returned non-JSON (${contentType || "no content-type"}): ${safeSlice(text, 200)}`
          );
        }

        let json: TimeseriesResponse;
        try {
          json = JSON.parse(text) as TimeseriesResponse;
        } catch {
          throw new Error(`Timeseries JSON parse failed: ${safeSlice(text, 200)}`);
        }

        setData(json);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Timeseries fetch failed");
      } finally {
        inFlightRef.current = false;
      }
    }

    // Debounce to avoid rapid re-renders triggering multiple loads
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(load, 150);

    let intervalId: number | null = null;
    if (opts.pollMs) {
      intervalId = window.setInterval(load, opts.pollMs);
    }

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (intervalId) window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [url, opts.pollMs]);

  return { data, error };
}