import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { gameImageTree } from "../src/charts/treemap.ts";
import { compareGroups } from "../src/model/groups.ts";
import { modelFromReport, unitTarget } from "../src/model/report.ts";
import { STATUSES } from "../src/model/status.ts";
import { DARK } from "../src/theme/tokens.ts";

interface Measures {
  total_functions: number;
  matched_functions: number;
  complete_units: number;
  total_code: string;
  complete_code: string;
  fuzzy_match_percent: number;
}
const file = JSON.parse(readFileSync(new URL("../data/report.json", import.meta.url), "utf8")) as {
  categories: { id: string; measures: Measures }[];
  units: { name: string; metadata: { progress_categories?: string[] } }[];
};
const model = modelFromReport(file);
const category = (id: string): Measures => file.categories.find((entry) => entry.id === id)!.measures;
const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);
const code = (c: { functions: number; exact: number; bytes: number; exactBytes: number }) => [c.functions, c.exact, c.bytes, c.exactBytes];

test("units name their image, and the image is the report's target", () => {
  assert.equal(unitTarget("exe/slus_004_22/func_80164028"), "exe/slus_004_22");
  assert.equal(unitTarget("exe/slus_004_22/MSC01-tail/InvSquareRoot"), "exe/slus_004_22");
  assert.equal(unitTarget("emi/battle/battle/03/func_801D1014"), "emi/battle/battle/03");
});

test("the headline counts every game function in the report", () => {
  const game = category("game");
  assert.equal(model.game.count, game.total_functions);
  assert.equal(model.game.done, game.complete_units);
  assert.equal(model.game.bytes, Number(game.total_code));
  assert.equal(model.game.doneBytes, Number(game.complete_code));
  assert.deepEqual(model.headline.game, { functions: game.total_functions, exact: game.complete_units, bytes: Number(game.total_code), exactBytes: Number(game.complete_code) });
});

test("every unit is counted once, in one part and one target", () => {
  assert.equal(model.functions.length, file.units.length);
  assert.equal(model.all.count, file.units.length);
  assert.equal(model.game.count + model.sdk.count + model.hand.count, file.units.length);
  assert.equal(model.game.count, category("game").total_functions);
  assert.equal(model.sdk.count, category("sdk").total_functions);
  assert.equal(model.hand.count, category("hand-asm").total_functions);
  for (const target of model.targets) {
    assert.equal(target.functions.length, target.all.count);
    assert.ok(target.functions.every((fn) => fn.id.startsWith(`${target.id}/`)));
    assert.equal(target.code.functions, target.game.count);
  }
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
  assert.equal(model.sdk.done, model.sdk.statuses.object.functions);
  assert.equal(sum(model.libraries.map((lib) => lib.count)), model.sdk.count);
  assert.equal(model.libraries.reduce((total, lib) => total + lib.functions.length, 0), model.sdk.count);
});

test("groups and targets partition the game code", () => {
  const groups = model.groups.reduce((total, group) => {
    const [functions, exact, bytes, exactBytes] = code(group.code);
    return { functions: total.functions + functions, exact: total.exact + exact, bytes: total.bytes + bytes, exactBytes: total.exactBytes + exactBytes };
  }, { functions: 0, exact: 0, bytes: 0, exactBytes: 0 });
  const expected = code({ functions: model.game.count, exact: model.game.done, bytes: model.game.bytes, exactBytes: model.game.doneBytes });
  assert.deepEqual(code(groups), expected);
  assert.deepEqual(code(model.code), expected);
  for (const group of model.groups) assert.ok(group.code.draft <= group.code.functions - group.code.exact, group.key);
  assert.equal(sum(model.targets.map((target) => target.game.count)), model.game.count);
  for (let index = 1; index < model.groups.length; index++) assert.ok(compareGroups(model.groups[index - 1], model.groups[index]) <= 0, model.groups[index].key);
});

test("zero-byte game functions keep a one-byte treemap weight", () => {
  const fn = model.functions.find((row) => row.kind === "game")!;
  const target = model.targetById.get(fn.target)!;
  const tree = gameImageTree({ ...target, functions: [{ ...fn, bytes: 0 }] }, DARK);
  assert.equal(tree.children?.[0]?.value, 1);
});
