// Address-ordered treemap: every byte of every loaded target gets area, and addresses that sit
// next to each other stay next to each other on the screen. Pure functions, no DOM.
//
// progress.json `targets[]` carry `units`: [offset, size, kind, status, name] rows in address
// order. Targets are laid out by `base`, then `id`; units by `offset`. d3-hierarchy's
// treemapBinary splits a parent rectangle at half its value, so children keep their input order
// while every rectangle's area stays proportional to its bytes.

import { hierarchy, treemap, treemapBinary } from "./vendor/d3-hierarchy.js";

const address = (target) => parseInt(target.base, 16);

// Targets in address order; the overlays that share a base fall back to their id.
export function orderTargets(targets) {
  return [...targets].sort((a, b) => address(a) - address(b) || a.id.localeCompare(b.id));
}

// The map as rectangles. `units` holds one {target, unit, x, y, w, h} per map row in address
// order; `targets` holds one {target, unit: null, x, y, w, h} per target for its frame and label.
export function treemapLayout(targets, width, height) {
  const root = hierarchy({
    children: orderTargets(targets).map((target) => ({
      target,
      children: [...target.units].sort((a, b) => a[0] - b[0]).map((unit) => ({ target, unit })),
    })),
  }).sum((node) => (node.unit ? node.unit[1] : 0));

  treemap().tile(treemapBinary).size([width, height])(root);

  const box = (node) => ({ x: node.x0, y: node.y0, w: node.x1 - node.x0, h: node.y1 - node.y0 });
  const units = [];
  const frames = root.children.map((targetNode) => {
    for (const unitNode of targetNode.children) {
      units.push({ target: targetNode.data.target, unit: unitNode.data.unit, ...box(unitNode) });
    }
    return { target: targetNode.data.target, unit: null, ...box(targetNode) };
  });
  return { targets: frames, units };
}
