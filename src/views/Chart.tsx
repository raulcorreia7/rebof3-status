// A thin Solid wrapper over one ECharts instance: it creates the chart when it scrolls into
// view, keeps it sized, and redraws when the option changes.

import type { ECharts } from "echarts/core";
import { createEffect, onCleanup, onMount, untrack } from "solid-js";
import type { ChartOption } from "../charts/register.ts";

export interface ChartClick {
  data?: { ref?: unknown };
}

/** Copy the drawn canvas over the chart, so an option swap fades instead of cutting. */
function capture(host: HTMLDivElement): HTMLCanvasElement | null {
  const source = [...host.querySelectorAll("canvas")].find((canvas) =>
    !canvas.classList.contains("chart-snapshot")
  );
  if (!source) return null;
  host.querySelector(".chart-snapshot")?.remove();
  const overlay = document.createElement("canvas");
  overlay.className =
    "chart-snapshot pointer-events-none absolute inset-0 size-full transition-opacity duration-180 ease-out";
  overlay.width = source.width;
  overlay.height = source.height;
  const context = overlay.getContext("2d");
  if (!context) return null;
  context.drawImage(source, 0, 0);
  host.append(overlay);
  return overlay;
}

/** Let the new drawing show through over 180 ms, then drop the copy. */
function release(overlay: HTMLCanvasElement): void {
  requestAnimationFrame(() => {
    overlay.style.opacity = "0";
  });
  window.setTimeout(() => overlay.remove(), 260);
}

interface Props {
  option: ChartOption;
  height: number;
  /** Accessible name; the chart is a picture, so the text next to it carries the numbers. */
  label: string;
  onClick?: (params: ChartClick) => void;
  /** Fade the previous drawing into the new one on an option change (treemap drills). */
  crossfade?: boolean;
  /** Replace the option instead of merging it; for a data swap the crossfade hides the cut. */
  replace?: boolean;
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
      chart.setOption(props.option);
    };
    const watcher = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && create(),
      { rootMargin: "300px" },
    );
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
      host.querySelector(".chart-snapshot")?.remove();
      chart?.dispose();
      chart = null;
    });
  });

  createEffect(() => {
    const option = props.option;
    if (!chart) return;
    // Merge, don't replace: a notMerge update tears down the series view and clears the canvas,
    // which reads as a flicker on every option change. The option builders disable series
    // animation; the treemap asks for a crossfade instead.
    const overlay = untrack(() => props.crossfade) ? capture(host) : null;
    chart.setOption(option, untrack(() => props.replace) ? { notMerge: true } : undefined);
    if (overlay) release(overlay);
  });

  return (
    <div
      ref={host}
      class="relative w-full"
      style={{ height: `${props.height}px` }}
      role="img"
      aria-label={props.label}
    />
  );
}
