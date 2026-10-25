import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildModel } from "../src/model/report.ts";
import { STATUSES } from "../src/model/status.ts";
import type { AssetCensus, History, Report, StatusCensus, StatusData } from "../src/types.ts";

const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as T;
const report = read<Report>("report.json");
const status = read<StatusData>("status-data.json");
const history = read<History>("history.json");
const census = read<StatusCensus>("status.json");
const assets = read<AssetCensus>("assets.json");
const model = buildModel(report, status, history, { census, assets });
const fallback = buildModel(report, status, history);
const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);
const category = (id: string) => report.categories.find((entry) => entry.id === id)!.measures;

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
  const sdk = category("sdk");
  assert.equal(model.sdk.count, sdk.total_functions);
  assert.equal(model.sdk.count + model.hand.count + model.game.count, report.units.length);
  assert.equal(model.sdk.done, model.sdk.statuses.object.functions);
  assert.equal(model.sdk.statuses.assembly.functions, 4);
  assert.equal(sum(model.libraries.map((lib) => lib.count)), model.sdk.count);
});

test("groups and targets partition the game code", () => {
  assert.equal(sum(model.groups.map((group) => group.count)), model.game.count);
  assert.equal(sum(model.groups.map((group) => group.done)), model.game.done);
  assert.equal(sum(model.targets.map((target) => target.game.count)), model.game.count);
  assert.equal(model.targets.length, status.targets.length);
  assert.deepEqual(model.groups.map((group) => group.key).slice(0, 2), ["exe/main", "exe/logo"]);
});

test("a target never reports more typed bytes than its data payload", () => {
  for (const target of model.targets) if (target.data) assert.ok(target.data.typed <= target.data.bytes, target.id);
});

