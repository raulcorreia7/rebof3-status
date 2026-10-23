import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildModel, unitAddress } from "../src/model/report.ts";
import { HOME } from "../src/model/route.ts";
import { legend, sdkLibraries } from "../src/selectors.ts";
import { DARK } from "../src/theme/tokens.ts";
import { STATUSES } from "../src/model/status.ts";
import type { History, Report, StatusData } from "../src/types.ts";

const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as T;
const report = read<Report>("report.json");
const status = read<StatusData>("status-data.json");
const history = read<History>("history.json");
const model = buildModel(report, status, history);
const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);
const category = (id: string) => report.categories.find((entry) => entry.id === id)!.measures;

test("game totals equal the report's game category", () => {
  const game = category("game");
  assert.equal(model.game.count, game.total_functions);
  assert.equal(model.game.done, game.matched_functions);
  assert.equal(model.game.bytes, Number(game.total_code));
  assert.equal(model.game.doneBytes, Number(game.matched_code));
  assert.equal(model.game.fuzzy.toFixed(5), Number(game.fuzzy_match_percent).toFixed(5));
});

test("game matches reconcile with bin/status once the hand-written assembly is set apart", () => {
  // The report packet: bin/status counts 3,133 of 3,454 game functions; report game 3,129 of
  // 3,449 plus the 4 exact hand-written assembly units is the same 3,133 of 3,454.
  assert.equal(model.game.done + model.hand.done, 3133);
  assert.equal(model.game.count + model.hand.count, 3454);
  assert.deepEqual([model.hand.done, model.hand.count], [4, 5]);
});

test("every status counts its functions and bytes exactly once", () => {
  for (const tally of [model.game, model.sdk, model.hand, model.all]) {
    assert.equal(sum(STATUSES.map((key) => tally.statuses[key].functions)), tally.count);
    assert.equal(sum(STATUSES.map((key) => tally.statuses[key].bytes)), tally.bytes);
  }
  const game = category("game");
  assert.equal(model.game.statuses.pure.functions, game.matched_functions);
  assert.equal(model.game.statuses.nonmatching.functions + model.game.statuses.open.functions, model.game.count - model.game.done);
});

test("the SDK and the hand-written assembly never enter the game tally", () => {
  const sdk = category("sdk");
  assert.equal(model.sdk.count, sdk.total_functions);
  assert.equal(model.sdk.count + model.hand.count + model.game.count, report.units.length);
  assert.equal(model.sdk.done, model.sdk.statuses.object.functions);
  assert.equal(model.sdk.statuses.assembly.functions, 4);
  assert.equal(model.libraries.length, 11);
  assert.equal(sum(model.libraries.map((lib) => lib.count)), model.sdk.count);
});

test("the data census is the only source of the data totals", () => {
  assert.deepEqual(model.data, { bytes: status.totals.data_payload, typed: status.totals.typed });
  assert.equal(sum(model.targets.map((target) => target.data?.bytes ?? 0)), status.totals.data_payload);
});

test("groups and targets partition the game code", () => {
  assert.equal(sum(model.groups.map((group) => group.count)), model.game.count);
  assert.equal(sum(model.groups.map((group) => group.done)), model.game.done);
  assert.equal(sum(model.targets.map((target) => target.game.count)), model.game.count);
  assert.equal(model.targets.length, status.targets.length);
  assert.deepEqual(model.groups.map((group) => group.key).slice(0, 2), ["exe/main", "exe/logo"]);
});

test("every unit lands in a target, and every SDK unit in a library", () => {
  assert.equal(model.functions.length, report.units.length);
  for (const fn of model.functions) {
    assert.ok(model.targetById.has(fn.target), fn.id);
    if (fn.kind === "sdk") assert.ok(fn.library, fn.id);
    assert.equal(model.functionById.get(fn.id), fn);
  }
});

test("unit names give the address when they carry one", () => {
  assert.equal(unitAddress("exe/slus_004_22/func_8015AD00"), 0x8015ad00);
  assert.equal(unitAddress("exe/slus_004_22/PopMatrix@0x80178BB4"), 0x80178bb4);
  assert.equal(unitAddress("exe/slus_004_22/MSC01-tail/InvSquareRoot"), null);
});

test("a target never reports more typed bytes than its data payload", () => {
  for (const target of model.targets) if (target.data) assert.ok(target.data.typed <= target.data.bytes, target.id);
  assert.deepEqual(model.targetById.get("emi/etc/start/08")!.data, { bytes: 9978, typed: 9978 });
  // The raw census is 20 bytes over: a draft's jump table is larger than the reviewed placement.
  const raw = status.targets.find((entry) => entry.target === "emi/etc/start/08")!;
  assert.equal(raw.typed - raw.data_payload, 20);
});

test("the map legend uses one denominator per scope", () => {
  const ctx = { model, route: { ...HOME, map: "tiles" as const }, tokens: DARK, limit: 200 };
  const game = legend(ctx);
  assert.deepEqual(game.items.map((item) => item.key), ["pure", "nonmatching", "open"]);
  assert.match(game.items.find((item) => item.key === "pure")!.sub!, /66\.6% of game code bytes/);
  const sdk = legend({ ...ctx, route: { ...HOME, map: "sdk" as const } });
  assert.deepEqual(sdk.items.map((item) => item.key), ["object", "assembly"]);
  assert.ok(sdk.items.every((item) => item.sub!.includes("of SDK bytes")));
});

test("the assembly-only library row reads as kept assembly", () => {
  const rows = sdkLibraries({ model, route: HOME, tokens: DARK, limit: 200 }).rows;
  const assembly = rows.find((row) => row.name?.label === "assembly only")!;
  assert.equal(assembly.count, "4");
  assert.equal(assembly.note, "kept as assembly");
  assert.doesNotMatch(String(assembly.aria), /0 \/ 4/);
});

test("the committed history ends at the report's own point", () => {
  const last = model.history[model.history.length - 1];
  assert.equal(last.date, history.generated_at.slice(0, 10));
  assert.equal(last.revision, history.commit);
  assert.equal(last.game_functions, model.game.count);
  assert.equal(last.game_matched, model.game.done);
  assert.equal(last.game_bytes, model.game.bytes);
  assert.equal(last.game_matched_bytes, model.game.doneBytes);
  assert.equal(last.sdk_done, model.sdk.done);
  assert.equal(last.data_typed, model.data!.typed);
  assert.equal(model.history.length, history.rows.length);
});
