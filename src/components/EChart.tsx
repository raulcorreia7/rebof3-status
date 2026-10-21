// A thin Preact wrapper over one ECharts instance: it creates the chart when it scrolls into
// view, keeps it sized, and redraws when the option changes.

import type { ECharts } from "echarts/core";
import { useEffect, useRef } from "preact/hooks";
import { echarts } from "../charts/canvas.ts";
import type { ChartOption } from "../charts/register.ts";

export interface ChartClick {
  data?: { ref?: unknown };
  name?: string;
  seriesName?: string;
  dataIndex?: number;
}

interface Props {
  option: ChartOption;
  height: number;
  /** Accessible name; the chart is a picture, so the text next to it carries the numbers. */
  label: string;
  onClick?: (params: ChartClick) => void;
  /** Receives the instance once it exists, and null when it is disposed. */
  chartRef?: { current: ECharts | null };
}

export function EChart({ option, height, label, onClick, chartRef }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const latest = useRef({ option, onClick });
  latest.current = { option, onClick };

  // Create the chart when the host is first visible.
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const create = () => {
      if (chart.current) return;
      const instance = echarts.init(element, null, { renderer: "canvas" });
      instance.on("click", (params) => latest.current.onClick?.(params as ChartClick));
      chart.current = instance;
      if (chartRef) chartRef.current = instance;
      instance.setOption(latest.current.option, true);
    };
    const watcher = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && create(), { rootMargin: "300px" });
    watcher.observe(element);
    const resizer = new ResizeObserver(() => chart.current?.resize());
    resizer.observe(element);
    return () => {
      watcher.disconnect();
      resizer.disconnect();
      chart.current?.dispose();
      chart.current = null;
      if (chartRef) chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  return <div ref={host} class="chart" style={{ height }} role="img" aria-label={label} />;
}
