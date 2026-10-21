// Horizontal stacked bars: status mix per target, tiers per library, typed data per target.

import type { Tokens } from "../theme/tokens.ts";
import { number } from "../model/format.ts";
import type { ChartOption } from "./register.ts";

export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}

export interface BarSpec {
  /** One category per bar, top to bottom. */
  categories: string[];
  series: BarSeries[];
  /** Label with the total at the end of each bar. */
  unit?: string;
  /** Show 0-100 instead of counts. */
  normalize?: boolean;
  /** Tooltip text of the bar at an index; the default lists the series values. */
  describe?: (index: number) => string;
}

export const BAR_HEIGHT = 22;

export function barOption({ categories, series, unit = "", normalize = false, describe }: BarSpec, tokens: Tokens): ChartOption {
  const text = { color: tokens.mute, fontSize: 11 };
  return {
    animation: false,
    grid: { left: 160, right: 16, top: 4, bottom: 22 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      confine: true,
      backgroundColor: tokens.card,
      borderColor: tokens.line,
      textStyle: { color: tokens.ink, fontSize: 12 },
      ...(describe
        ? { formatter: (params: { dataIndex: number }[]) => describe(params[0].dataIndex) }
        : { valueFormatter: (value: number) => `${number(value)}${unit ? ` ${unit}` : ""}` }),
    },
    xAxis: {
      type: "value",
      max: normalize ? 100 : undefined,
      axisLabel: { ...text, formatter: (value: number) => (normalize ? `${value}%` : number(value)) },
      splitLine: { lineStyle: { color: tokens.line, opacity: 0.5 } },
    },
    yAxis: { type: "category", inverse: true, data: categories, axisLabel: { ...text, color: tokens.ink, width: 148, overflow: "truncate" }, axisTick: { show: false }, axisLine: { lineStyle: { color: tokens.line } } },
    series: series.map((part) => ({
      name: part.name,
      type: "bar",
      stack: "total",
      barWidth: BAR_HEIGHT - 8,
      data: part.values,
      itemStyle: { color: part.color },
      emphasis: { focus: "series" },
    })),
  };
}
