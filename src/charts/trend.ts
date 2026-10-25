// Trend charts: one line per history series, drawn by ECharts in the page and, through SSR,
// in progress.svg.

import { formatValue, series, type TrendChart } from "../model/history.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { HistoryRow } from "../types.ts";
import type { ChartOption } from "./register.ts";

const lineColor = (tokens: Tokens, key: string): string => (key === "mute" ? tokens.mute : tokens.status[key as keyof Tokens["status"]]);

/** The latest value of a chart, formatted; null when it has no points. */
export function latest(days: HistoryRow[], chart: TrendChart): string | null {
  const points = series(days, chart);
  return points.length ? formatValue(points[points.length - 1][1], chart) : null;
}

interface TrendOptions {
  /** Draw the title and the date labels inside the chart, as the picture does. */
  titled?: boolean;
  fontFamily?: string;
}

/** The option of one trend chart, or null when it has no points. */
export function trendOption(days: HistoryRow[], chart: TrendChart, tokens: Tokens, { titled = false, fontFamily }: TrendOptions = {}): ChartOption | null {
  const points = series(days, chart);
  if (!points.length) return null;
  const color = lineColor(tokens, chart.color);
  const last = latest(days, chart);
  const text = { color: tokens.mute, fontSize: titled ? 12 : 11, fontFamily };
  return {
    animation: false,
    textStyle: { fontFamily },
    grid: { left: 48, right: 16, top: titled ? 38 : 12, bottom: 24 },
    title: titled ? { text: `${chart.title}: ${last}`, left: 0, top: 0, textStyle: { color: tokens.ink, fontSize: 16, fontWeight: "normal", fontFamily } } : undefined,
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: tokens.card,
      borderColor: tokens.line,
      textStyle: { color: tokens.ink, fontSize: 12 },
      valueFormatter: (value: number) => formatValue(value, chart),
    },
    xAxis: {
      type: "time",
      minInterval: 24 * 3600 * 1000,
      axisLine: { lineStyle: { color: tokens.line } },
      axisTick: { show: false },
      axisLabel: { ...text, hideOverlap: true, formatter: "{MM}-{dd}" },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: false,
      min: 0,
      axisLabel: { ...text, formatter: (value: number) => formatValue(value, { unit: chart.unit, digits: 0 }) },
      splitLine: { lineStyle: { color: tokens.line, opacity: 0.5 } },
    },
    series: [
      {
        name: chart.title,
        type: "line",
        // The series default is true and would animate past the top-level `animation: false`.
        animation: false,
        data: points,
        symbol: points.length < 40 ? "circle" : "none",
        symbolSize: 5,
        showSymbol: points.length < 40,
        lineStyle: { color, width: 2.5 },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.14 },
      },
    ],
    aria: { enabled: true, label: { description: `${chart.title}. Latest ${last}.` } },
  };
}
