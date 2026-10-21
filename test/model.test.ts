import assert from "node:assert/strict";
import { test } from "node:test";
import { browse } from "../src/model/browse.ts";
import { TREND_CHARTS, byDay, series } from "../src/model/history.ts";
import { findFunction, neighbours, sourcePath, sourceUrl } from "../src/model/index.ts";
import { HOME, formatHash, parseHash } from "../src/model/route.ts";
import { STATUSES } from "../src/model/status.ts";
import type { HistoryRow } from "../src/types.ts";
import { data, model } from "./fixture.ts";

const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);

test("game totals equal summary.game, status by status", () => {
  const { game } = data.summary;
  assert.equal(model.game.count, game.functions);
  assert.equal(model.game.bytes, game.bytes);
  assert.equal(model.game.done, game.done_functions);
  assert.equal(model.game.doneBytes, game.done_bytes);
  for (const key of STATUSES) assert.deepEqual([model.game.statuses[key].functions, model.game.statuses[key].bytes], game.statuses[key], key);
});

test("SDK totals equal summary.sdk, status by status", () => {
  const { sdk } = data.summary;
  assert.equal(model.sdk.count, sdk.functions);
  assert.equal(model.sdk.bytes, sdk.bytes);
  assert.equal(model.sdk.done, sdk.done_functions);
  assert.equal(model.sdk.doneBytes, sdk.done_bytes);
  for (const key of STATUSES) assert.deepEqual([model.sdk.statuses[key].functions, model.sdk.statuses[key].bytes], sdk.statuses[key], key);
});

test("groups partition the game code and add up to the summary", () => {
  assert.equal(sum(model.groups.map((g) => g.count)), data.summary.game.functions);
  assert.equal(sum(model.groups.map((g) => g.done)), data.summary.game.done_functions);
  assert.equal(sum(model.groups.map((g) => g.bytes)), data.summary.game.bytes);
  assert.equal(sum(model.groups.map((g) => g.targets.length)), data.targets.length);
  for (const group of model.groups) {
    assert.equal(group.count, sum(group.targets.map((t) => t.game.count)), group.key);
    assert.ok(group.label && !group.label.includes("undefined"), group.key);
  }
});

test("targets fall into the expected groups", () => {
  const keys = (id: string) => model.targetById.get(id)?.group;
  assert.equal(keys("exe/slus_004_22"), "exe/main");
  assert.equal(keys("exe/logo"), "exe/logo");
  assert.equal(keys("emi/battle/battle/03"), "emi/battle");
  assert.equal(keys("emi/etc/game/00"), "emi/etc");
  assert.equal(keys("emi/world00/area030/04"), "emi/world00");
  assert.equal(keys("emi/scenario/scena00/00"), "emi/scenario");
  assert.deepEqual(model.groups.map((g) => g.key), ["exe/main", "exe/logo", "emi/etc", "emi/battle", "emi/scenario", "emi/world00"]);
});

test("function ids are unique and every library function is attached", () => {
  assert.equal(model.functionById.size, model.functions.length);
  const attached = model.functions.filter((fn) => fn.library);
  assert.equal(attached.length, sum(data.libraries.map((lib) => lib.functions.length)));
  assert.ok(attached.every((fn) => fn.kind === "sdk"));
  for (const lib of model.libraries) assert.equal(lib.functions.length, sum(Object.values(lib.tiers)), lib.name);
});

test("typed data and quality come straight from the summary", () => {
  assert.deepEqual(model.data, data.summary.data);
  assert.equal(sum(data.targets.map((t) => t.data?.bytes ?? 0)), data.summary.data?.bytes);
  assert.equal(model.quality.fakes, model.quality.harmful_fakes + model.quality.benign_fakes);
});

test("source links follow the project's naming rule at the measured commit", () => {
  const fn = findFunction(model, "exe/slus_004_22", model.functions.find((f) => f.target === "exe/slus_004_22" && f.status === "pure")!.addr)!;
  assert.equal(sourcePath(fn), `src/exe/slus_004_22/${fn.name}.c`);
  assert.match(sourceUrl("abc", sourcePath(fn)!), /^https:\/\/github\.com\/raulcorreia7\/rebof3-simple\/blob\/abc\/src\/exe\/slus_004_22\/.+\.c$/);
  const object = model.functions.find((f) => f.status === "object")!;
  assert.equal(sourcePath(object), null);
});

test("findFunction accepts a target prefix and neighbours walk the address order", () => {
  const fn = model.targetById.get("exe/slus_004_22")!.functions[10];
  assert.equal(findFunction(model, "exe", fn.addr), fn);
  assert.equal(findFunction(model, "exe/slus_004_22", fn.addr.toLowerCase().replace("0X", "0x")), fn);
  assert.equal(findFunction(model, "exe", "0xZZ"), null);
  const { previous, next } = neighbours(model, fn);
  assert.ok(previous && next && previous.address < fn.address && next.address > fn.address);
});

test("browse filters, sorts and counts like the summary", () => {
  const all = browse(model, HOME);
  assert.equal(all.length, data.summary.code.functions);
  const open = browse(model, { ...HOME, st: ["open"] });
  assert.equal(open.length, data.summary.game.statuses.open[0]);
  const sdk = browse(model, { ...HOME, part: "sdk" });
  assert.equal(sdk.length, data.summary.sdk.functions);
  const bySize = browse(model, { ...HOME, part: "game", sort: "size", dir: "desc" });
  assert.ok(bySize[0].bytes >= bySize[1].bytes);
  const hit = browse(model, { ...HOME, q: "0x8015AD00" });
  assert.ok(hit.every((fn) => fn.addr === "0x8015AD00"));
  assert.equal(browse(model, { ...HOME, q: "nothing-matches-this" }).length, 0);
  assert.ok(browse(model, { ...HOME, group: "emi/battle" }).every((fn) => fn.target.startsWith("emi/battle/")));
});

test("hash routes round-trip", () => {
  for (const hash of ["", "#fn/exe/slus_004_22/0x8015AD00", "#target/emi/world00/area030/04", "#group/emi/battle", "#?q=cure&st=pure%2Copen&part=sdk&sort=size&dir=desc&map=strips&reserved=1"]) {
    assert.equal(formatHash(parseHash(hash)), hash);
  }
  assert.deepEqual(parseHash("#fn/exe/0x8015AD00").view, { kind: "fn", target: "exe", addr: "0x8015AD00" });
  assert.deepEqual(parseHash("#nonsense").view, { kind: "home" });
  assert.deepEqual(parseHash("#?st=pure,bogus").st, ["pure"]);
});

test("history keeps the last row of a day and series drop unmeasured days", () => {
  const row = (date: string, fakes: number | null, matched = 0): HistoryRow => ({ date, revision: "r", source: "git", game_functions: 100, game_matched: matched, fakes });
  const days = byDay([row("2026-01-02", 5), row("2026-01-01", 1), row("2026-01-02", 7), row("2026-01-03", null)]);
  assert.deepEqual(days.map((d) => [d.date, d.fakes]), [["2026-01-01", 1], ["2026-01-02", 7], ["2026-01-03", null]]);
  const fakes = TREND_CHARTS.find((c) => c.id === "fakes")!;
  assert.deepEqual(series(days, fakes), [["2026-01-01", 1], ["2026-01-02", 7]]);
  const matched = TREND_CHARTS.find((c) => c.id === "gameFunctions")!;
  const progress = byDay([row("2026-01-01", 0, 0), row("2026-01-02", 0, 0), row("2026-01-03", 0, 10), row("2026-01-04", 0, 20)]);
  assert.deepEqual(series(progress, matched), [["2026-01-02", 0], ["2026-01-03", 10], ["2026-01-04", 20]]);
});

test("every real history chart has finite points", () => {
  for (const chart of TREND_CHARTS) for (const [, value] of series(model.history, chart)) assert.ok(Number.isFinite(value), chart.id);
  assert.equal(new Set(model.history.map((d) => d.date)).size, model.history.length);
});
