import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { modelFromFiles } from "../src/model/report.ts";
import { AssetCensusSchema, ReportSchema, StatusCensusSchema, StatusDataSchema } from "../src/model/schema.ts";
import { STATUSES } from "../src/model/status.ts";

const read = (name: string): unknown => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const files = { report: read("report.json"), data: read("status-data.json"), history: read("history.json"), census: read("status.json"), assets: read("assets.json") };
const report = ReportSchema.parse(files.report);
const status = StatusDataSchema.parse(files.data);
const census = StatusCensusSchema.parse(files.census);
const assets = AssetCensusSchema.parse(files.assets);
const model = modelFromFiles(files);
const fallback = modelFromFiles({ ...files, census: null, assets: null });
const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);
const sdkFunctions = (files.report as { categories: { id: string; measures: { total_functions: number } }[] }).categories.find((entry) => entry.id === "sdk")!.measures.total_functions;

test("the headline counts game code from bin/status, and from the report only without status.json", () => {
  const code = census.game_code;
  assert.deepEqual(model.headline.game, {
    functions: code.functions,
    exact: code.exact,
    bytes: code.bytes,
    exactBytes: code.exact_bytes,
    unique: { functions: code.unique_functions, exact: code.unique_exact, bytes: code.unique_bytes, exactBytes: code.unique_exact_bytes },
  });
  // The report misses the units whose split asm it cannot find; the headline never does.
  assert.ok(model.game.count <= code.functions);
  assert.ok(code.unique_functions <= code.functions && code.unique_exact <= code.exact);
  assert.deepEqual(fallback.headline.game, { functions: model.game.count, exact: model.game.done, bytes: model.game.bytes, exactBytes: model.game.doneBytes, unique: null });
  assert.deepEqual([model.hand.done, model.hand.count], [4, 5]);
});

test("typed data leaves out byte arrays named by address, and assets stay apart", () => {
  assert.equal(model.headline.data!.typed, status.totals.typed);
  assert.equal(model.headline.data!.rawC, status.totals.raw_c);
  assert.ok(status.totals.typed + status.totals.raw_c! <= status.totals.data_payload);
  const { totals, kinds } = assets;
  assert.equal(sum(kinds.map((kind) => kind.bytes)), totals.bytes);
  assert.ok(totals.decoded_bytes <= totals.extracted_bytes && totals.extracted_bytes <= totals.bytes);
  assert.ok(!kinds.some((kind) => kind.kind === "code" || kind.kind === "executable"), "program code is game code, not an asset");
  assert.equal(model.headline.assets!.decoded, totals.decoded_bytes);
  assert.equal(fallback.headline.assets, null);
});

test("every status counts its functions and bytes exactly once", () => {
  for (const tally of [model.game, model.sdk, model.hand, model.all]) {
    assert.equal(sum(STATUSES.map((key) => tally.statuses[key].functions)), tally.count);
    assert.equal(sum(STATUSES.map((key) => tally.statuses[key].bytes)), tally.bytes);
  }
  assert.equal(model.game.statuses.pure.functions, model.game.done);
  assert.equal(model.game.statuses.nonmatching.functions + model.game.statuses.open.functions, model.game.count - model.game.done);
});

test("the SDK and the hand-written assembly never enter the game tally", () => {
  assert.equal(model.sdk.count, sdkFunctions);
  assert.equal(model.sdk.count + model.hand.count + model.game.count, report.units.length);
  assert.equal(model.sdk.done, model.sdk.statuses.object.functions);
  assert.equal(model.sdk.statuses.assembly.functions, 4);
  assert.equal(sum(model.libraries.map((lib) => lib.count)), model.sdk.count);
});

test("groups and targets partition the game code", () => {
  // Every bin/status function sits in exactly one group, so the groups add up to the headline.
  const four = (c: { functions: number; exact: number; bytes: number; exactBytes: number }) => [c.functions, c.exact, c.bytes, c.exactBytes];
  const added = (groups: typeof model.groups) => four({ functions: sum(groups.map((g) => g.code.functions)), exact: sum(groups.map((g) => g.code.exact)), bytes: sum(groups.map((g) => g.code.bytes)), exactBytes: sum(groups.map((g) => g.code.exactBytes)) });
  assert.deepEqual(added(model.groups), four(model.headline.game));
  assert.deepEqual(added(fallback.groups), four(fallback.headline.game));
  assert.deepEqual(four(model.code), four(model.headline.game));
  for (const group of model.groups) assert.ok(group.code.draft <= group.code.functions - group.code.exact, group.key);
  assert.equal(sum(model.targets.map((target) => target.game.count)), model.game.count);
  assert.equal(model.targets.length, status.targets.length);
  assert.deepEqual(model.groups.map((group) => group.key), ["main", "system", "battle", "magic", "bosses", "characters", "world", "scenario"]);
});

test("a target never reports more typed bytes than its data payload", () => {
  for (const target of model.targets) if (target.data) assert.ok(target.data.typed <= target.data.bytes, target.id);
});

