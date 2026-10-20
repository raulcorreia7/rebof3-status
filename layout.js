// Address-true layout: where each map row of a target is drawn. Pure functions, no DOM.
//
// A target's rows are contiguous in address order (progress.json `units`: [offset, size, ...]).
// The strip wraps like text: row r covers bytes [r * rowBytes, (r + 1) * rowBytes), so reading
// left to right and top to bottom walks the address range. A row that crosses the end of a
// strip row continues on the next one.

// Bytes per pixel the strips may use, smallest first: 4 B shows a single instruction.
export const SCALES = [4, 8, 16, 32, 64, 128, 256, 512, 1024];

// The smallest scale at which `size` bytes fit in `maxRows` strip rows of `width` pixels.
export function pickScale(size, width, maxRows, scales = SCALES) {
  return scales.find((scale) => Math.ceil(size / (scale * width)) <= maxRows) ?? scales[scales.length - 1];
}

// Strip pieces for rows [offset, size, ...]: [index, stripRow, x, w], x and w in pixels.
// A row never draws narrower than minWidth, so a one-instruction function stays visible.
export function place(units, bytesPerPx, width, minWidth = 0.5) {
  const rowBytes = bytesPerPx * width;
  const pieces = [];
  units.forEach(([offset, size], index) => {
    let start = offset;
    const end = offset + size;
    while (start < end) {
      const stripRow = Math.floor(start / rowBytes);
      const stop = Math.min(end, (stripRow + 1) * rowBytes);
      const x = (start - stripRow * rowBytes) / bytesPerPx;
      pieces.push([index, stripRow, x, Math.min(Math.max((stop - start) / bytesPerPx, minWidth), width - x)]);
      start = stop;
    }
  });
  return pieces;
}

export const stripRows = (size, bytesPerPx, width) => Math.max(Math.ceil(size / (bytesPerPx * width)), 1);

// Rows kept by `keep`, with their offsets packed from zero: [unit, at] in address order.
// Packing closes the gap a hidden row leaves, so the strip's scale can shrink and the kept
// bytes fill every row. `size` is the packed length in bytes.
export function pack(units, keep) {
  let at = 0;
  const rows = [];
  for (const unit of units) {
    if (!keep(unit)) continue;
    rows.push({ unit, at });
    at += unit[1];
  }
  return { rows, size: at };
}

// `content` cut with an ellipsis so it measures at most `room` pixels; "" when not even the
// ellipsis fits. `measure` is the caller's text width function.
export function fitText(content, size, room, measure) {
  if (!content || room <= 0) return "";
  if (measure(content, size) <= room) return content;
  const ellipsis = "…";
  if (measure(ellipsis, size) > room) return "";
  let cut = content;
  while (cut && measure(cut + ellipsis, size) > room) cut = cut.slice(0, -1);
  return cut + ellipsis;
}
