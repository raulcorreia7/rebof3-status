import assert from "node:assert/strict";
import { test } from "node:test";
import { fitText, pack, pickScale, place, stripRows } from "./layout.js";

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

test("pack closes the gap a hidden row leaves and keeps address order", () => {
  const units = [
    [0, 100, "d", "header", "psx_exe_header"],
    [100, 40, "f", "pure", "a"],
    [140, 60, "d", "raw", "pad_140"],
    [200, 20, "f", "open", "b"],
  ];
  const { rows, size } = pack(units, (unit) => !unit[4].startsWith("pad_"));
  assert.deepEqual(rows.map(({ unit, at }) => [unit[4], at]), [["psx_exe_header", 0], ["a", 100], ["b", 140]]);
  assert.equal(size, 160);
});

test("fitText keeps a label that fits, cuts one that does not, and drops an unreadable one", () => {
  const measure = (text, size) => text.length * size;
  assert.equal(fitText("SLUS_004.22", 10, 120, measure), "SLUS_004.22");
  assert.equal(fitText("SLUS_004.22", 10, 60, measure), "SLUS_…");
  assert.equal(fitText("SLUS_004.22", 10, 4, measure), "");
});
