// The chart options must never leave ECharts' series-level animation on: the treemap series
// defaults to a 900 ms update animation even when the option says `animation: false`.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { barOption } from "../src/charts/bars.ts";
import { trendOption } from "../src/charts/trend.ts";
import { treemapOption, treemapTree } from "../src/charts/treemap.ts";
import { TREND_CHARTS } from "../src/model/history.ts";
import { buildModel } from "../src/model/report.ts";
import { DARK } from "../src/theme/tokens.ts";
import type { History, Report, StatusData } from "../src/types.ts";

const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as T;
const model = buildModel(read<Report>("report.json"), read<StatusData>("status-data.json"), read<History>("history.json"));

interface Series {
  animation?: boolean;
  animationDurationUpdate?: number;
  data?: unknown[];
}

// The option types are unions; the tests read the series each builder returns.
const seriesOf = (option: unknown): Series[] => {
  if (typeof option !== "object" || option === null || !("series" in option) || !Array.isArray(option.series)) {
    throw new Error("the option has a series");
  }
  return option.series as Series[];
};

test("no chart builder relies on ECharts' series animation defaults", () => {
  const bar = seriesOf(barOption({ categories: ["one"], series: [{ name: "part", color: "#000", values: [1] }] }, DARK));
  assert.equal(bar[0].animation, false);

  const trend = trendOption(model.history, TREND_CHARTS[0], DARK);
  assert.ok(trend);
  assert.equal(seriesOf(trend)[0].animation, false);

  const tree = treemapTree(model, "game", { tokens: DARK, statuses: [] });
  const map = seriesOf(treemapOption(tree, { tokens: DARK }, () => undefined));
  assert.equal(map[0].animation, false);
  assert.equal(map[0].animationDurationUpdate, 0);
  assert.equal(map[0].data, tree.children);
});

test("the map tree keeps its identity until its paint inputs change", () => {
  const first = treemapTree(model, "game", { tokens: DARK, statuses: [] });
  assert.equal(treemapTree(model, "game", { tokens: DARK, statuses: [] }), first);
  assert.notEqual(treemapTree(model, "game", { tokens: DARK, statuses: ["pure"] }), first);
});
