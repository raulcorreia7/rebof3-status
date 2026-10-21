// A thin Solid wrapper over one ECharts instance: it creates the chart when it scrolls into
// view, keeps it sized, and redraws when the option changes.

import type { ECharts } from "echarts/core";
import { createEffect, onCleanup, onMount } from "solid-js";
import type { ChartOption } from "../charts/register.ts";

export interface ChartClick {
  data?: { ref?: unknown };
}

interface Props {
  option: ChartOption;
  height: number;
  /** Accessible name; the chart is a picture, so the text next to it carries the numbers. */
  label: string;
  onClick?: (params: ChartClick) => void;
  /** Receives the instance once it exists, and null when it is disposed. */
  onChart?: (chart: ECharts | null) => void;
}

export function Chart(props: Props) {
  let host!: HTMLDivElement;
  let chart: ECharts | null = null;
  let gone = false;

  onMount(() => {
    let starting = false;
    // ECharts loads as its own chunk, so the page text paints before the chart code is parsed.
    const create = async () => {
      if (chart || starting) return;
      starting = true;
      const { echarts } = await import("../charts/canvas.ts");
      if (gone) return;
      chart = echarts.init(host, null, { renderer: "canvas" });
      chart.on("click", (params) => props.onClick?.(params as ChartClick));
      props.onChart?.(chart);
      chart.setOption(props.option, true);
    };
    const watcher = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && create(), { rootMargin: "300px" });
    watcher.observe(host);
    // Resize on the next frame, once per frame, so a drag of the window does not redraw per event.
    let frame = 0;
    const resizer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => chart?.resize());
    });
    resizer.observe(host);
    onCleanup(() => {
      gone = true;
      cancelAnimationFrame(frame);
      watcher.disconnect();
      resizer.disconnect();
      chart?.dispose();
      chart = null;
      props.onChart?.(null);
    });
  });

  createEffect(() => {
    const option = props.option;
    chart?.setOption(option, true);
  });

  return <div ref={host} class="chart" style={{ height: `${props.height}px` }} role="img" aria-label={props.label} />;
}
