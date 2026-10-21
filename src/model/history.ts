// History rows (one per publish) -> one row per day, and the series the trend charts draw.

import { TREND } from "../strings.ts";
import type { HistoryRow, ProgressData } from "../types.ts";

/** Rows sorted by date; when a day has several rows the last one wins. */
export function byDay(rows: HistoryRow[]): HistoryRow[] {
  const days = new Map<string, HistoryRow>();
  for (const row of rows) days.set(row.date, row);
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The history row that restates the headline numbers of a document, as rebof3's run_row does.
 * The page adds it so the last point of every chart matches the numbers above them, even when
 * the history file has no row for the day yet.
 */
export function snapshotRow(data: ProgressData): HistoryRow {
  const { game, sdk, quality } = data.summary;
  const bytes = data.summary.data;
  return {
    date: data.generated_at.slice(0, 10),
    revision: data.commit,
    source: "snapshot",
    game_functions: game.functions,
    game_matched: game.done_functions,
    game_bytes: game.bytes,
    game_matched_bytes: game.done_bytes,
    sdk_functions: sdk.functions,
    sdk_done: sdk.done_functions,
    data_bytes: bytes?.bytes ?? null,
    data_typed: bytes?.typed ?? null,
    fakes: quality.fakes,
    harmful_fakes: quality.harmful_fakes,
    field_ref: quality.field_ref,
    local_externs: quality.local_externs,
    sym_conflicts: quality.sym_conflicts,
  };
}

type Measure = (row: HistoryRow) => number | null;

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const ratio =
  (top: string, bottom: string): Measure =>
  (row) => {
    const [a, b] = [num(row[top]), num(row[bottom])];
    return a === null || !b ? null : (100 * a) / b;
  };
const count =
  (key: string): Measure =>
  (row) =>
    num(row[key]);

export interface TrendChart {
  id: string;
  title: string;
  pick: Measure;
  /** Drop the days before the first matched work. */
  trim: boolean;
  /** A status key or "mute". */
  color: string;
  unit: string;
  digits: number;
}

const chart = (id: string, title: string, pick: Measure, color: string, unit: string, digits: number, trim = false): TrendChart => ({
  id, title, pick, trim, color, unit, digits,
});

/** The charts in reading order. */
export const TREND_CHARTS: TrendChart[] = [
  chart("gameFunctions", TREND.charts.gameFunctions, ratio("game_matched", "game_functions"), "pure", "%", 1, true),
  chart("gameBytes", TREND.charts.gameBytes, ratio("game_matched_bytes", "game_bytes"), "pure", "%", 1, true),
  chart("sdk", TREND.charts.sdk, ratio("sdk_done", "sdk_functions"), "object", "%", 1),
  chart("data", TREND.charts.data, ratio("data_typed", "data_bytes"), "asm", "%", 2),
  chart("fakes", TREND.charts.fakes, count("fakes"), "mute", "", 0),
  chart("harmful", TREND.charts.harmful, count("harmful_fakes"), "nonmatching", "", 0),
  chart("fieldRef", TREND.charts.fieldRef, count("field_ref"), "mute", "", 0),
  chart("localExterns", TREND.charts.localExterns, count("local_externs"), "mute", "", 0),
];

/**
 * Points [date, value] of one chart. Days without a measurement drop out; a share also drops the
 * days before the first matched work but keeps the day just before it as the zero line.
 */
export function series(days: HistoryRow[], { pick, trim }: Pick<TrendChart, "pick" | "trim">): [string, number][] {
  const points = days.flatMap((row): [string, number][] => {
    const value = pick(row);
    return value === null ? [] : [[row.date, value]];
  });
  const first = trim ? points.findIndex(([, value]) => value > 0) : 0;
  return first < 0 ? [] : points.slice(trim ? Math.max(first - 1, 0) : 0);
}

export const formatValue = (value: number, { unit, digits }: Pick<TrendChart, "unit" | "digits">): string => `${value.toFixed(digits)}${unit}`;
