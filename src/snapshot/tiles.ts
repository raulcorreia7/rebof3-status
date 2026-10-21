// One square per function, packed into blocks and squarified into a panel (the picture's map).

import { STATUS_LABEL } from "../strings.ts";
import { escapeText, number, round } from "../model/format.ts";
import { STATUSES } from "../model/status.ts";
import { shorten, textWidth } from "../model/text.ts";
import type { Fn } from "../types.ts";
import { C, frame, rect, text } from "./svg.ts";

// Pixels of panel area per code byte; sets how large the tiles are.
const AREA_PER_BYTE = 0.85;
// A function counts for at least this many bytes, so a stub still gets a visible tile.
const MIN_BYTES = 80;
// A block smaller than this many pixels joins the "other" block, which names its members.
const MERGE_AREA = 2300;
const INSET = 2;
const TILE_GAP = 1;
const LABEL_SIZE = 15;

export interface Block {
  name: string;
  rows: Fn[];
}

/** Squarified treemap (Bruls, Huizing and van Wijk, 2000): one [x, y, w, h] per weight. */
export function squarify(weights: number[], x: number, y: number, w: number, h: number): [number, number, number, number][] {
  const worst = (row: number[], side: number) => {
    const total = row.reduce((a, b) => a + b, 0);
    return Math.max(...row.map((item) => Math.max((side * side * item) / (total * total), (total * total) / (side * side * item))));
  };
  const order = weights.map((_, index) => index).sort((a, b) => weights[b] - weights[a]);
  const total = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((): [number, number, number, number] => [x, y, 0, 0]);
  if (total <= 0 || w <= 0 || h <= 0) return out;
  const areas = order.map((index) => (weights[index] * w * h) / total);
  let start = 0;
  while (start < areas.length) {
    const side = Math.min(w, h);
    let end = start + 1;
    while (end < areas.length && worst(areas.slice(start, end + 1), side) <= worst(areas.slice(start, end), side)) end++;
    const row = areas.slice(start, end);
    const thickness = row.reduce((a, b) => a + b, 0) / side;
    let offset = 0;
    row.forEach((area, k) => {
      const length = area / thickness;
      out[order[start + k]] = w >= h ? [x, y + offset, thickness, length] : [x + offset, y, length, thickness];
      offset += length;
    });
    if (w >= h) [x, w] = [x + thickness, w - thickness];
    else [y, h] = [y + thickness, h - thickness];
    start = end;
  }
  return out;
}

/** The largest square pitch and column count that fit `count` tiles in a box. */
export function grid(count: number, width: number, height: number): [pitch: number, cols: number] {
  let best: [number, number] = [0, 1];
  for (let cols = 1; cols <= count; cols++) {
    const pitch = Math.min(width / cols, height / Math.ceil(count / cols));
    if (pitch > best[0]) best = [pitch, cols];
  }
  return best;
}

/** A block label in the box's top-left corner, shortened until it fits; null when none fits. */
function label(name: string, w: number, h: number): { lines: string[]; size: number } | null {
  const short = name.replace(".EMI", "");
  const [head, slot] = short.split(" slot ");
  const two = slot === undefined ? null : [head, `slot ${slot}`];
  const [stem, ext] = short.split(".");
  const halves = ext !== undefined ? [stem, ext] : short.includes(" ") ? null : [short.slice(0, short.length >> 1), short.slice(short.length >> 1)];
  const [lead, rest] = short.split(": ");
  const listed = rest === undefined ? null : [`${lead}:`, ...rest.split(", ")];
  const tries: [string[] | null, number][] = [
    [[name], LABEL_SIZE], [[short], LABEL_SIZE], [[short], LABEL_SIZE - 3], [two, LABEL_SIZE - 3],
    [[short], LABEL_SIZE - 5], [two, LABEL_SIZE - 5], [listed, LABEL_SIZE - 3], [listed, LABEL_SIZE - 5],
    [halves, LABEL_SIZE - 5], [halves, LABEL_SIZE - 7],
  ];
  for (const [lines, size] of tries) {
    if (!lines) continue;
    const tall = lines.length * (size + 2) + 3;
    if (tall <= h && Math.max(...lines.map((line) => textWidth(line, size))) <= w - 8) return { lines, size };
  }
  return null;
}

const weightOf = (rows: Fn[]): number => rows.reduce((sum, row) => sum + Math.max(row.bytes, MIN_BYTES), 0);

/** Rows in tile order: by status, then target, then address. */
export const sorted = (rows: Fn[]): Fn[] =>
  [...rows].sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.target.localeCompare(b.target) || a.address - b.address);

const tip = (fn: Fn): string => `${fn.id} ${fn.name} · ${STATUS_LABEL[fn.status]} · ${number(fn.bytes)} B`;

function block(rows: Fn[], name: string, box: number[]): { svg: string; fitted: boolean } {
  const x = box[0] + INSET;
  const y = box[1] + INSET;
  const w = box[2] - 2 * INSET;
  const h = box[3] - 2 * INSET;
  if (w < 2 || h < 2) return { svg: "", fitted: false };
  const [pitch, cols] = grid(rows.length, w, h);
  const edge = pitch - (pitch >= 4 ? TILE_GAP : 0);
  let svg = "";
  rows.forEach((row, index) => {
    const [line, col] = [Math.floor(index / cols), index % cols];
    svg += rect(x + col * pitch, y + line * pitch, edge, edge, C.status[row.status], `<title>${escapeText(tip(row))}</title>`);
  });
  const fit = label(name, w, h);
  if (fit) fit.lines.forEach((line, n) => (svg += text(x + 4, y + 2 + n * (fit.size + 2), line, fit.size, "#ffffff", { outline: true })));
  return { svg, fitted: fit !== null };
}

/** Blocks under MERGE_AREA join one "other" block that names them. */
function mergeSmall(blocks: Block[], scale: number): Block[] {
  const small = blocks.filter((b) => weightOf(b.rows) * AREA_PER_BYTE * scale < MERGE_AREA);
  if (small.length < 2) return blocks;
  const kept = blocks.filter((b) => !small.includes(b));
  return [...kept, { name: `other: ${small.map((b) => b.name).join(", ")}`, rows: sorted(small.flatMap((b) => b.rows)) }];
}

/** A panel: heading, then blocks by code bytes. Returns the SVG and the y below it. */
export function panel(title: string, blocks: Block[], x: number, y: number, width: number, scale: number): { svg: string; bottom: number } {
  const merged = mergeSmall(blocks, scale);
  const area = merged.reduce((sum, b) => sum + weightOf(b.rows), 0) * AREA_PER_BYTE * scale;
  const height = area / width;
  const top = y + 40;
  const boxes = squarify(merged.map((b) => weightOf(b.rows)), x, top, width, height);
  const size = textWidth(title, 24) <= width ? 24 : 19;
  let svg = text(x, y, shorten(title, size, width), size, C.ink);
  const leaders: [Block, number[]][] = [];
  merged.forEach((b, index) => {
    const drawn = block(b.rows, b.name, boxes[index]);
    svg += drawn.svg;
    if (!drawn.fitted) leaders.push([b, boxes[index]]);
  });
  svg += frame(x - 1, top - 1, width + 2, height + 2, C.line);
  let bottom = top + height;
  for (const [b, box] of leaders) {
    const cx = box[0] + box[2] / 2;
    svg += `<path d="M${round(cx)} ${round(box[1] + box[3] / 2)}V${round(bottom + 8)}" stroke="${C.mute}" fill="none"/>`;
    svg += text(x + width, bottom + 10, shorten(b.name, 14, width), 14, C.ink, { anchor: "end" });
    bottom += 20;
  }
  return { svg, bottom: bottom + (leaders.length ? 8 : 0) };
}

export { weightOf };
