import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { gameImageTree, gameTree } from "../src/charts/treemap.ts";
import { compareGroups } from "../src/model/groups.ts";
import { modelFromReport, unitTarget } from "../src/model/report.ts";
import { STATUSES } from "../src/model/status.ts";
import { DARK } from "../src/theme/tokens.ts";

interface Measures {
  total_functions: number;
  matched_functions: number;
  complete_units: number;
  total_code: string;
  matched_code: string;
  complete_code: string;
  fuzzy_match_percent: number;
}
interface RawFunction {
  name: string;
  size?: string;
  fuzzy_match_percent?: number;
  address?: string;
}
interface RawUnit {
  name: string;
  functions: RawFunction[];
  metadata: { progress_categories?: string[] };
}
const file = JSON.parse(readFileSync(new URL("../data/report.json", import.meta.url), "utf8")) as {
  categories: { id: string; measures: Measures }[];
  units: RawUnit[];
};
const model = modelFromReport(file);
const category = (id: string): Measures =>
  file.categories.find((entry) => entry.id === id)!.measures;
const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);
const code = (
  c: { functions: number; exact: number; bytes: number; exactBytes: number },
) => [c.functions, c.exact, c.bytes, c.exactBytes];
const functions = file.units.flatMap((unit) => unit.functions);

test("units name their image, and the image is the report's target", () => {
  assert.equal(unitTarget("exe/slus_004_22/func_80164028"), "exe/slus_004_22");
  assert.equal(unitTarget("exe/slus_004_22/MSC01-tail/InvSquareRoot"), "exe/slus_004_22");
  assert.equal(unitTarget("emi/battle/battle/03/func_801D1014"), "emi/battle/battle/03");
});

test("the headline counts functions, matched functions and their bytes", () => {
  const game = category("game");
  assert.equal(model.game.count, game.total_functions);
  assert.equal(model.game.done, game.matched_functions);
  assert.equal(model.game.bytes, Number(game.total_code));
  assert.equal(model.game.doneBytes, Number(game.matched_code));
  assert.deepEqual(model.code, {
    functions: game.total_functions,
    exact: game.matched_functions,
    draft: model.code.draft,
    bytes: Number(game.total_code),
    exactBytes: Number(game.matched_code),
    draftBytes: model.code.draftBytes,
  });
});

test("the SDK and hand-written assembly agree with their categories", () => {
  for (const [part, id] of [["sdk", "sdk"], ["hand", "hand-asm"]] as const) {
    const measures = category(id);
    const tally = model[part];
    assert.equal(tally.count, measures.total_functions, part);
    assert.equal(tally.done, measures.matched_functions, part);
    assert.equal(tally.bytes, Number(measures.total_code), part);
    assert.equal(tally.doneBytes, Number(measures.matched_code), part);
  }
});

test("every unit function is counted once, in one file and one target", () => {
  const units = model.targets.flatMap((target) => target.units);
  assert.equal(units.length, file.units.length);
  assert.equal(model.functions.length, functions.length);
  assert.equal(model.game.count + model.sdk.count + model.hand.count, functions.length);
  for (const unit of units) {
    assert.ok(unit.functions.length, unit.id);
    assert.equal(unit.bytes, sum(unit.functions.map((fn) => fn.bytes)), unit.id);
    assert.ok(
      unit.functions.every((fn) => fn.unit === unit.id && fn.target === unit.target),
      unit.id,
    );
    assert.equal(unit.matched, unit.functions.filter((fn) => fn.fuzzy === 100).length, unit.id);
    assert.equal(
      unit.matchedBytes,
      sum(unit.functions.filter((fn) => fn.fuzzy === 100).map((fn) => fn.bytes)),
      unit.id,
    );
  }
  for (const target of model.targets) {
    assert.equal(target.functions.length, target.all.count);
    assert.equal(target.units.length, new Set(target.functions.map((fn) => fn.unit)).size);
    assert.ok(target.functions.every((fn) => fn.target === target.id));
    assert.equal(target.code.functions, target.game.count);
  }
});

test("every status counts its functions and bytes exactly once", () => {
  for (const tally of [model.game, model.sdk, model.hand]) {
    assert.equal(sum(STATUSES.map((key) => tally.statuses[key].functions)), tally.count);
    assert.equal(sum(STATUSES.map((key) => tally.statuses[key].bytes)), tally.bytes);
  }
  assert.equal(model.game.statuses.pure.functions, model.game.done);
  assert.equal(
    model.game.statuses.nonmatching.functions + model.game.statuses.open.functions,
    model.game.count - model.game.done,
  );
  assert.equal(
    model.game.done + model.sdk.done + model.hand.done,
    sum(file.categories.map((entry) => entry.measures.matched_functions)),
  );
});

test("the SDK assembly-only functions still count as matched", () => {
  assert.equal(
    model.sdk.done,
    model.sdk.statuses.object.functions + model.sdk.statuses.assembly.functions,
  );
  assert.equal(sum(model.libraries.map((lib) => lib.count)), model.sdk.count);
  assert.equal(
    model.libraries.reduce((total, lib) => total + lib.functions.length, 0),
    model.sdk.count,
  );
});

test("groups and targets partition the game code", () => {
  const groups = model.groups.reduce((total, group) => {
    const [count, exact, bytes, exactBytes] = code(group.code);
    return {
      functions: total.functions + count,
      exact: total.exact + exact,
      bytes: total.bytes + bytes,
      exactBytes: total.exactBytes + exactBytes,
    };
  }, { functions: 0, exact: 0, bytes: 0, exactBytes: 0 });
  const expected = code({
    functions: model.game.count,
    exact: model.game.done,
    bytes: model.game.bytes,
    exactBytes: model.game.doneBytes,
  });
  assert.deepEqual(code(groups), expected);
  assert.deepEqual(code(model.code), expected);
  for (const group of model.groups) {
    assert.ok(group.code.draft <= group.code.functions - group.code.exact, group.key);
  }
  assert.equal(sum(model.targets.map((target) => target.game.count)), model.game.count);
  for (let index = 1; index < model.groups.length; index++) {
    assert.ok(
      compareGroups(model.groups[index - 1], model.groups[index]) <= 0,
      model.groups[index].key,
    );
  }
});

test("zero-byte functions keep a one-byte treemap weight", () => {
  const fn = model.functions.find((row) => row.kind === "game")!;
  const target = model.targetById.get(fn.target)!;
  const tree = gameImageTree({ ...target, functions: [{ ...fn, bytes: 0 }] }, DARK);
  assert.equal(tree.children?.[0]?.value, 1);
});

test("SDK units keep their library and member, and stay out of the game figures", () => {
  const sdk = model.functions.filter((fn) => fn.kind === "sdk");
  assert.ok(sdk.every((fn) => fn.library));
  assert.ok(sdk.some((fn) => fn.tier === "object" && fn.member));
  assert.ok(sdk.some((fn) => fn.tier === "assembly" && fn.library !== "assembly"));
  assert.equal(model.game.count, model.functions.filter((fn) => fn.kind === "game").length);
});

test("an executable's treemap holds one SDK group by library, in the SDK colour", () => {
  const target = model.targetById.get("exe/slus_004_22")!;
  const tree = gameImageTree(target, DARK, true);
  const group = tree.children!.filter((node) => node.id.startsWith("sdk:"));
  assert.equal(group.length, 1);
  assert.ok(group[0].children!.length > 1);
  const cells = group[0].children!.flatMap((library) => library.children!);
  assert.ok(cells.every((cell) => cell.itemStyle?.color === DARK.sdk));
  assert.equal(
    cells.reduce((total, cell) => total + cell.value, 0),
    target.functions.filter((fn) => fn.kind === "sdk").reduce(
      (t, fn) => t + Math.max(fn.bytes, 1),
      0,
    ),
  );
});

test("overview groups SDK functions once by library in both views", () => {
  for (const view of ["part", "image"] as const) {
    const tree = gameTree(model.groups, DARK, view);
    const sdk = tree.children!.filter((node) => node.ref.kind === "sdk");
    assert.equal(sdk.length, 1);
    const libraries = sdk[0].children!;
    assert.equal(new Set(libraries.map((library) => library.name)).size, libraries.length);
    assert.equal(sum(libraries.map((library) => library.children!.length)), model.sdk.count);
    const game = tree.children!.filter((node) => node.ref.kind !== "sdk");
    assert.ok(game.every((node) => node.ref.kind === view));
  }
});
