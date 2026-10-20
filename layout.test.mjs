import assert from "node:assert/strict";
import { test } from "node:test";
import { pickScale, place, stripRows } from "./layout.js";

test("pickScale takes the finest scale that fits the row budget", () => {
  assert.equal(pickScale(1445888, 940, 13), 128);
  assert.equal(pickScale(512, 940, 12), 4);
});

test("place wraps a row across strip rows and keeps address order", () => {
  // 100 px wide at 1 B/px: row 0 holds bytes 0-99.
  const pieces = place([[0, 60], [60, 80], [140, 10]], 1, 100);
  assert.deepEqual(pieces, [[0, 0, 0, 60], [1, 0, 60, 40], [1, 1, 0, 40], [2, 1, 40, 10]]);
});

test("place gives a tiny row the minimum width and never leaves the strip", () => {
  const [[, , x, w]] = place([[99, 1]], 64, 100);
  assert.ok(w >= 0.5 && x + w <= 100);
});

test("stripRows counts the rows a range needs", () => {
  assert.equal(stripRows(201, 1, 100), 3);
});
