import { useEffect, useMemo, useRef, useState } from "react";
import uPlot from "uplot";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";

type Props = {
  data: uPlot.AlignedData;
  options: Omit<uPlot.Options, "width" | "height">;
  height?: number;
  className?: string;
  minWidth?: number;
};

/**
 * Responsive uPlot wrapper that measures the parent width and resizes automatically.
 * Uses ResizeObserver to react to layout changes (sidebar, grid, window resize, etc.).
 */
export function ResponsiveUPlot({
  data,
  options,
  height = 320,
  className,
  minWidth = 320,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(minWidth);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      setWidth(Math.max(minWidth, w));
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => ro.disconnect();
  }, [minWidth]);

  const finalOptions = useMemo<uPlot.Options>(() => {
    return {
      ...options,
      width,
      height,
    };
  }, [options, width, height]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%" }}>
      <UplotReact options={finalOptions} data={data} />
    </div>
  );
}