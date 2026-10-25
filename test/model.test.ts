import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildModel, unitAddress } from "../src/model/report.ts";
import { HOME } from "../src/model/route.ts";
import { legend, sdkLibraries } from "../src/selectors.ts";
import { DARK } from "../src/theme/tokens.ts";
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

test("game totals equal the report's game category by bytes", () => {
  // A report unit is one C source or one split asm file, which can hold several functions.
  const game = category("game");
  assert.ok(model.game.count <= game.total_functions!);
  assert.ok(model.game.done <= game.matched_functions!);
  assert.equal(model.game.bytes, Number(game.total_code));
  // A MATCH unit counts whole; objdiff can still rate a few of its bytes as different (relocations).
  assert.ok(model.game.doneBytes >= Number(game.matched_code));
  assert.equal(model.game.fuzzy.toFixed(5), Number(game.fuzzy_match_percent).toFixed(5));
});

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

test("the data census is the only source of the data totals", () => {
  assert.deepEqual(model.data, { bytes: status.totals.data_payload, typed: status.totals.typed });
  assert.equal(model.headline.data!.apart!.reserved, status.totals.reserved);
  assert.equal(sum(model.targets.map((target) => target.data?.bytes ?? 0)), status.totals.data_payload);
});

test("groups and targets partition the game code", () => {
  assert.equal(sum(model.groups.map((group) => group.count)), model.game.count);
  assert.equal(sum(model.groups.map((group) => group.done)), model.game.done);
  assert.equal(sum(model.targets.map((target) => target.game.count)), model.game.count);
  assert.equal(model.targets.length, status.targets.length);
  assert.deepEqual(model.groups.map((group) => group.key).slice(0, 2), ["exe/main", "exe/logo"]);
});

test("the executables lead, overlay groups and their targets run biggest first, and the areas are one group", () => {
  const overlays = model.groups.slice(2);
  assert.ok(overlays.every((group, i) => i === 0 || overlays[i - 1].bytes >= group.bytes));
  for (const group of model.groups) assert.ok(group.targets.every((t, i) => i === 0 || group.targets[i - 1].game.bytes >= t.game.bytes));
  assert.deepEqual(model.groups.filter((group) => group.key.startsWith("emi/world")).map((group) => group.key), ["emi/world"]);
  assert.equal(sum(model.groups.map((group) => group.data?.bytes ?? 0)), sum(model.targets.map((t) => t.data?.bytes ?? 0)));
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
});

test("the map legend uses one denominator per scope", () => {
  const ctx = { model, route: { ...HOME, map: "tiles" as const }, tokens: DARK, limit: 200 };
  const game = legend(ctx);
  assert.deepEqual(game.items.map((item) => item.key), ["pure", "nonmatching", "open"]);
  const pure = (100 * model.game.statuses.pure.bytes) / model.game.bytes;
  assert.match(game.items.find((item) => item.key === "pure")!.sub!, new RegExp(`${pure.toFixed(1).replace(".", "\\.")}% of game code bytes`));
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
  assert.equal(last.game_functions, model.headline.game.functions);
  assert.equal(last.game_matched, model.headline.game.exact);
  assert.equal(last.game_bytes, model.headline.game.bytes);
  assert.equal(last.game_matched_bytes, model.headline.game.exactBytes);
  assert.equal(last.game_unique, census.game_code.unique_functions);
  assert.equal(last.sdk_done, model.sdk.done);
  assert.equal(last.data_typed, model.data!.typed);
  assert.equal(model.history.length, history.rows.length);
});
