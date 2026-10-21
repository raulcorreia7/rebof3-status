import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildModel } from "../src/model/index.ts";
import { STATUSES } from "../src/model/status.ts";
import type { ProgressData } from "../src/types.ts";

const data: ProgressData = JSON.parse(readFileSync(new URL("../progress.json", import.meta.url), "utf8"));
const model = buildModel(data);
const sum = (items: number[]) => items.reduce((a, b) => a + b, 0);

test("game and SDK totals equal the summary, status by status", () => {
  for (const [tally, scope] of [[model.game, data.summary.game], [model.sdk, data.summary.sdk]] as const) {
    assert.equal(tally.count, scope.functions);
    assert.equal(tally.bytes, scope.bytes);
    assert.equal(tally.done, scope.done_functions);
    assert.equal(tally.doneBytes, scope.done_bytes);
    for (const key of STATUSES) assert.deepEqual([tally.statuses[key].functions, tally.statuses[key].bytes], scope.statuses[key], key);
  }
});

test("the groups partition the game code and add up to the summary", () => {
  assert.equal(sum(model.groups.map((group) => group.count)), data.summary.game.functions);
  assert.equal(sum(model.groups.map((group) => group.done)), data.summary.game.done_functions);
  assert.equal(sum(model.groups.map((group) => group.targets.length)), data.targets.length);
  assert.deepEqual(model.groups.map((group) => group.key).slice(0, 2), ["exe/main", "exe/logo"]);
});
