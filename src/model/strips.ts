// Address-true strips: where each map row of a target is drawn. Pure functions, no DOM.
//
// A target's rows are contiguous in address order (progress.json `units`). A strip wraps like
// text: strip row r covers bytes [r * rowBytes, (r + 1) * rowBytes), so reading left to right and
// top to bottom walks the address range. A unit that crosses the end of a strip row continues on
// the next one.

import type { Target, Unit } from "../types.ts";

/** Bytes per pixel a strip may use, finest first: 4 B shows a single instruction. */
export const SCALES = [4, 8, 16, 32, 64, 128, 256, 512, 1024];

/** The finest scale at which `size` bytes fit in `maxRows` strip rows of `width` pixels. */
export function pickScale(size: number, width: number, maxRows: number, scales = SCALES): number {
  return scales.find((scale) => Math.ceil(size / (scale * width)) <= maxRows) ?? scales[scales.length - 1];
}

export const stripRows = (size: number, bytesPerPx: number, width: number): number =>
  Math.max(Math.ceil(size / (bytesPerPx * width)), 1);

/** A drawn piece of a unit: [unit index, strip row, x, width], x and width in pixels. */
export type Piece = [index: number, row: number, x: number, width: number];

/** Strip pieces for entries at `offset` with `size`. A piece is never narrower than `minWidth`. */
export function place(entries: { offset: number; size: number }[], bytesPerPx: number, width: number, minWidth = 0.5): Piece[] {
  const rowBytes = bytesPerPx * width;
  const pieces: Piece[] = [];
  entries.forEach(({ offset, size }, index) => {
    let start = offset;
    const end = offset + size;
    while (start < end) {
      const row = Math.floor(start / rowBytes);
      const stop = Math.min(end, (row + 1) * rowBytes);
      const x = (start - row * rowBytes) / bytesPerPx;
      pieces.push([index, row, x, Math.min(Math.max((stop - start) / bytesPerPx, minWidth), width - x)]);
      start = stop;
    }
  });
  return pieces;
}

/**
 * Rows of the load space that hold neither code nor data: the executable's load slots, the tail
 * a loader leaves for overlays and the Splat map's pad and gap rows. progress.json carries no
 * class for them, so their names name them; a row that is not data is never reserved.
 */
const RESERVED_ROW = /^(psx_exe_header|entry_header|post_emi_loader_tail|post_emi_gap|pad_|.*_pad$|.*_gap$|arena|.*_arena$)/;
export const isReserved = (unit: Unit): boolean => unit[2] === "d" && RESERVED_ROW.test(unit[4]);

export interface StripEntry {
  unit: Unit;
  offset: number;
  size: number;
  reserved: boolean;
}

/**
 * The entries to draw. With reserved space hidden the gaps close, so the remaining bytes fill every
 * strip row and the scale can shrink; with it shown every unit keeps its address offset.
 */
export function stripEntries(target: Target, showReserved: boolean): { entries: StripEntry[]; size: number } {
  const units = [...target.units].sort((a, b) => a[0] - b[0]);
  if (showReserved) return { entries: units.map((unit) => ({ unit, offset: unit[0], size: unit[1], reserved: isReserved(unit) })), size: target.size };
  let at = 0;
  const entries: StripEntry[] = [];
  for (const unit of units) {
    if (isReserved(unit)) continue;
    entries.push({ unit, offset: at, size: unit[1], reserved: false });
    at += unit[1];
  }
  return { entries, size: at };
}

/** `content` cut with an ellipsis to measure at most `room`; "" when not even the ellipsis fits. */
export function fitText(content: string, size: number, room: number, measure: (text: string, size: number) => number): string {
  if (!content || room <= 0) return "";
  if (measure(content, size) <= room) return content;
  const ellipsis = "…";
  if (measure(ellipsis, size) > room) return "";
  let cut = content;
  while (cut && measure(cut + ellipsis, size) > room) cut = cut.slice(0, -1);
  return cut + ellipsis;
}
