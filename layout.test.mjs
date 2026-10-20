import assert from "node:assert/strict";
import { test } from "node:test";
import { treemapLayout } from "./layout.js";

// Three targets, deliberately not given in address order, with small and large rows.
const TARGETS = [
  {
    id: "emi/b",
    base: "0x2000",
    end: "0x2320",
    units: [
      [0, 300, "f", "pure", "b0"],
      [300, 100, "d", "raw", "b1"],
      [400, 400, "f", "open", "b2"],
    ],
  },
  {
    id: "exe/a",
    base: "0x1000",
    end: "0x1C80",
    units: [
      [0, 1000, "f", "pure", "a0"],
      [1000, 600, "f", "aided", "a1"],
      [1600, 1600, "d", "typed", "a2"],
    ],
  },
  {
    id: "emi/a",
    base: "0x2000",
    end: "0x2100",
    units: [[0, 256, "s", "object", "c0"]],
  },
];

const WIDTH = 1020;
const HEIGHT = 640;
const layout = treemapLayout(TARGETS, WIDTH, HEIGHT);
const area = (rect) => rect.w * rect.h;
const targetBytes = (target) => target.units.reduce((sum, [offset, size]) => sum + size, 0);
const rectBytes = (rect) => (rect.unit ? rect.unit[1] : targetBytes(rect.target));

test("every rectangle keeps its share of the map within 1% of its share of the bytes", () => {
  const totalBytes = TARGETS.reduce((sum, target) => sum + targetBytes(target), 0);
  const totalArea = WIDTH * HEIGHT;
  for (const rect of [...layout.targets, ...layout.units]) {
    const expected = (rectBytes(rect) / totalBytes) * totalArea;
    assert.ok(
      Math.abs(area(rect) - expected) <= 0.01 * expected,
      `${rect.target.id} expected ${expected} px², got ${area(rect)} px²`,
    );
  }
});

test("every unit stays inside its target's frame", () => {
  const frames = new Map(layout.targets.map((rect) => [rect.target, rect]));
  for (const rect of layout.units) {
    const frame = frames.get(rect.target);
    assert.ok(rect.x >= frame.x - 1e-9 && rect.y >= frame.y - 1e-9, `${rect.target.id} starts outside its frame`);
    assert.ok(rect.x + rect.w <= frame.x + frame.w + 1e-9, `${rect.target.id} crosses its frame's right edge`);
    assert.ok(rect.y + rect.h <= frame.y + frame.h + 1e-9, `${rect.target.id} crosses its frame's bottom edge`);
  }
});

test("targets and units come out in address order", () => {
  const ordered = [...TARGETS].sort((a, b) => parseInt(a.base, 16) - parseInt(b.base, 16) || a.id.localeCompare(b.id));
  assert.deepEqual(layout.targets.map((rect) => rect.target.id), ordered.map((target) => target.id));
  assert.deepEqual(
    layout.units.map((rect) => `${rect.target.id}@${rect.unit[0]}`),
    ordered.flatMap((target) => target.units.map(([offset]) => `${target.id}@${offset}`)),
  );
});
