import assert from "node:assert/strict";
import { test } from "node:test";
import { fitText, isReserved, pickScale, place, stripEntries, stripRows } from "../src/model/strips.ts";
import type { Target, Unit } from "../src/types.ts";
import { model } from "./fixture.ts";

test("pickScale takes the finest scale that fits the row budget", () => {
  assert.equal(pickScale(1445888, 940, 13), 128);
  assert.equal(pickScale(512, 940, 12), 4);
});

test("place wraps a unit across strip rows and keeps address order", () => {
  // 100 px wide at 1 B/px: row 0 holds bytes 0-99.
  const entries = [
    { offset: 0, size: 60 },
    { offset: 60, size: 80 },
    { offset: 140, size: 10 },
  ];
  assert.deepEqual(place(entries, 1, 100), [[0, 0, 0, 60], [1, 0, 60, 40], [1, 1, 0, 40], [2, 1, 40, 10]]);
});

test("place gives a tiny unit the minimum width and never leaves the strip", () => {
  const [[, , x, w]] = place([{ offset: 99, size: 1 }], 64, 100);
  assert.ok(w >= 0.5 && x + w <= 100);
});

test("stripRows counts the rows a range needs", () => {
  assert.equal(stripRows(201, 1, 100), 3);
});

test("hiding reserved space packs the remaining units from zero", () => {
  const units: Unit[] = [
    [0, 100, "d", "header", "psx_exe_header"],
    [100, 40, "f", "pure", "a"],
    [140, 60, "d", "raw", "pad_140"],
    [200, 20, "f", "open", "b"],
  ];
  const target = { units, size: 220 } as unknown as Target;
  const hidden = stripEntries(target, false);
  assert.deepEqual(hidden.entries.map((e) => [e.unit[4], e.offset]), [["a", 0], ["b", 40]]);
  assert.equal(hidden.size, 60);
  const shown = stripEntries(target, true);
  assert.equal(shown.entries.length, 4);
  assert.deepEqual(shown.entries.filter((e) => e.reserved).map((e) => e.unit[4]), ["psx_exe_header", "pad_140"]);
  assert.equal(shown.size, 220);
});

test("a function row is never reserved, whatever its name", () => {
  assert.equal(isReserved([0, 4, "f", "open", "pad_0"]), false);
});

test("every real target packs inside its range", () => {
  for (const target of model.targets) {
    for (const showReserved of [false, true]) {
      const { entries, size } = stripEntries(target, showReserved);
      assert.ok(size <= target.size, target.id);
      for (const entry of entries) assert.ok(entry.offset + entry.size <= size, `${target.id} ${entry.unit[4]}`);
    }
  }
});

test("fitText keeps a label that fits, cuts one that does not, and drops an unreadable one", () => {
  const measure = (text: string, size: number) => text.length * size;
  assert.equal(fitText("SLUS_004.22", 10, 120, measure), "SLUS_004.22");
  assert.equal(fitText("SLUS_004.22", 10, 60, measure), "SLUS_…");
  assert.equal(fitText("SLUS_004.22", 10, 4, measure), "");
});
