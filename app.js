// Status board for the Breath of Fire III decompilation.
//
// render(data) turns progress.json into one SVG string: the same string fills the web page
// (index.html) and, through build.mjs, becomes progress.svg and progress.png. badge(data)
// returns the small README badge. The file has no dependencies and runs in a browser and in Node.

const WIDTH = 1600;
const MARGIN = 24;
const GAP = 20;
const GAME_WIDTH = 1020;
const SIDE_WIDTH = WIDTH - 2 * MARGIN - GAME_WIDTH - GAP;
const FONT = "'DejaVu Sans', Verdana, Arial, sans-serif";

// Pixels of panel area per code byte; sets how large the tiles are.
const AREA_PER_BYTE = 0.85;
// A function counts for at least this many bytes, so a stub still gets a visible tile.
const MIN_BYTES = 80;
// A block smaller than this many pixels joins the "other" block, which names its members.
const MERGE_AREA = 2300;
// The SDK panel is drawn at this multiple of the game tile scale so its libraries stay readable.
const SDK_SCALE = 2;
const INSET = 2;
const TILE_GAP = 1;
const LABEL_SIZE = 15;

const BACKGROUND = "#0d1117";
const OUTLINE = "#30363d";
const INK = "#c9d1d9";
const MUTED = "#8b949e";
const TRACK = "#21262d";

// Status key -> [legend text, tile colour], in tile order: finished work first.
const STATUS = {
  pure: ["matched C", "#2ea043"],
  aided: ["matched C with aids", "#7ee787"],
  asm: ["original assembly (exact)", "#79c0ff"],
  object: ["library object", "#26a69a"],
  assembly: ["library assembly", "#db6d28"],
  nonmatching: ["in progress (C, not yet exact)", "#d29922"],
  open: ["assembly", "#4b535d"],
};
const ORDER = Object.keys(STATUS);

const number = (value) => value.toLocaleString("en-US");
const share = (done, total) => (total ? (100 * done) / total : 0);
const percent = (done, total, digits = 2) => share(done, total).toFixed(digits);
const round = (value) => Math.round(value * 100) / 100;
const escape = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Text width in pixels, estimated from DejaVu Sans widths so the browser and Node agree.
function textWidth(text, size) {
  let em = 0;
  for (const char of text) {
    if (char === " ") em += 0.32;
    else if (/[il.,:;'|!]/.test(char)) em += 0.3;
    else if (/[mwMW]/.test(char)) em += 0.92;
    else if (/[A-Z0-9_@%]/.test(char)) em += 0.7;
    else em += 0.6;
  }
  return em * size;
}

// Text whose top edge is y; anchor is "start", "middle" or "end".
function text(x, y, content, size, fill, { anchor = "start", weight = "normal", outline = false } = {}) {
  const halo = outline ? ` stroke="${BACKGROUND}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"` : "";
  return (
    `<text x="${round(x)}" y="${round(y + size * 0.8)}" font-size="${size}" fill="${fill}"` +
    ` text-anchor="${anchor}" font-weight="${weight}"${halo}>${escape(content)}</text>`
  );
}

const rect = (x, y, w, h, fill, inner = "") => {
  const box = `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${fill}"`;
  return inner ? `${box}>${inner}</rect>` : `${box}/>`;
};

const frame = (x, y, w, h, color) =>
  `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="none" stroke="${color}"/>`;

// Squarified treemap (Bruls, Huizing and van Wijk, 2000): one [x, y, w, h] per weight.
function worst(row, side) {
  const total = row.reduce((a, b) => a + b, 0);
  return Math.max(...row.map((item) => Math.max((side * side * item) / (total * total), (total * total) / (side * side * item))));
}

function squarify(weights, x, y, w, h) {
  const order = weights.map((_, index) => index).sort((a, b) => weights[b] - weights[a]);
  const total = weights.reduce((a, b) => a + b, 0);
  const out = weights.map(() => [x, y, 0, 0]);
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

// The largest square pitch and column count that fit count tiles in a box.
function grid(count, width, height) {
  let best = [0, 1];
  for (let cols = 1; cols <= count; cols++) {
    const pitch = Math.min(width / cols, height / Math.ceil(count / cols));
    if (pitch > best[0]) best = [pitch, cols];
  }
  return best;
}

// A block label in the box's top-left corner, shortened until it fits; null when none fits.
function label(name, w, h) {
  const short = name.replace(".EMI", "");
  const [head, slot] = short.split(" slot ");
  const two = slot === undefined ? null : [head, `slot ${slot}`];
  const [stem, ext] = short.split(".");
  const halves = ext !== undefined ? [stem, ext] : short.includes(" ") ? null : [short.slice(0, short.length >> 1), short.slice(short.length >> 1)];
  const [lead, rest] = short.split(": ");
  const listed = rest === undefined ? null : [`${lead}:`, ...rest.split(", ")];
  const tries = [
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

const weightOf = (rows) => rows.reduce((sum, row) => sum + Math.max(row.bytes, MIN_BYTES), 0);

// One block: a dense grid of square tiles and its label. Returns the SVG and whether the label fit.
function block(rows, name, box) {
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
    svg += rect(x + col * pitch, y + line * pitch, edge, edge, STATUS[row.status][1], `<title>${escape(row.tip)}</title>`);
  });
  const fit = label(name, w, h);
  if (fit) {
    fit.lines.forEach((line, n) => {
      svg += text(x + 4, y + 2 + n * (fit.size + 2), line, fit.size, "#ffffff", { outline: true });
    });
  }
  return { svg, fitted: fit !== null };
}

// Rows in tile order: by status, then address.
function sorted(rows) {
  return [...rows].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.target.localeCompare(b.target) || a.address - b.address,
  );
}

function tile(target, fn) {
  return {
    status: fn.status,
    bytes: fn.bytes,
    target,
    address: parseInt(fn.addr, 16),
    tip: `${target}@${fn.addr} ${fn.name} · ${STATUS[fn.status][0]} · ${number(fn.bytes)} B`,
  };
}

// Blocks under MERGE_AREA join one "other" block that names them.
function mergeSmall(blocks, scale) {
  const small = blocks.filter((b) => weightOf(b.rows) * AREA_PER_BYTE * scale < MERGE_AREA);
  if (small.length < 2) return blocks;
  const kept = blocks.filter((b) => !small.includes(b));
  return [...kept, { name: `other: ${small.map((b) => b.name).join(", ")}`, rows: sorted(small.flatMap((b) => b.rows)) }];
}

// A panel: heading, blocks by code bytes. Returns the SVG and the y below it.
function panel(title, blocks, x, y, width, scale) {
  const head = title === null ? 0 : 40;
  const merged = mergeSmall(blocks, scale);
  const area = merged.reduce((sum, b) => sum + weightOf(b.rows), 0) * AREA_PER_BYTE * scale;
  const height = area / width;
  const top = y + head;
  const boxes = squarify(merged.map((b) => weightOf(b.rows)), x, top, width, height);
  let svg = title === null ? "" : text(x, y, title, 24, INK);
  const leaders = [];
  merged.forEach((b, index) => {
    const drawn = block(b.rows, b.name, boxes[index]);
    svg += drawn.svg;
    if (!drawn.fitted) leaders.push([b, boxes[index]]);
  });
  svg += frame(x - 1, top - 1, width + 2, height + 2, OUTLINE);
  let bottom = top + height;
  for (const [b, box] of leaders) {
    const cx = box[0] + box[2] / 2;
    svg += `<path d="M${round(cx)} ${round(box[1] + box[3] / 2)}V${round(bottom + 8)}" stroke="${MUTED}" fill="none"/>`;
    svg += text(x + width, bottom + 10, b.name, 14, INK, { anchor: "end" });
    bottom += 20;
  }
  return { svg, bottom };
}

function gamePanel(data) {
  const blocks = data.targets
    .filter((target) => target.functions.length)
    .map((target) => ({ name: target.name, rows: sorted(target.functions.map((fn) => tile(target.id, fn))) }));
  const game = data.summary.game;
  const title = `Game code: ${percent(game.done_functions, game.functions)}% matched (${number(game.done_functions)} / ${number(game.functions)})`;
  return { title, blocks };
}

function sdkPanel(data) {
  const blocks = data.libraries.map((lib) => ({
    name: lib.name,
    rows: sorted(lib.functions.map((fn) => tile(fn.target, fn))),
  }));
  const sdk = data.summary.sdk;
  const title = `PsyQ SDK: ${percent(sdk.done_functions, sdk.functions)}% object or C (${number(sdk.done_functions)} / ${number(sdk.functions)})`;
  return { title, blocks };
}

// Four headline cards: big share, then what it counts.
function cards(data, y) {
  const { game, sdk, data: bytes } = data.summary;
  const items = [
    [`${percent(game.done_functions, game.functions, 1)}%`, "Game code matched", `${number(game.done_functions)} of ${number(game.functions)} functions`, STATUS.pure[1]],
    [`${percent(game.done_bytes, game.bytes, 1)}%`, "Game code bytes matched", `${number(game.done_bytes)} of ${number(game.bytes)} B`, STATUS.pure[1]],
    [`${percent(sdk.done_functions, sdk.functions, 1)}%`, "PsyQ SDK as object or C", `${number(sdk.done_functions)} of ${number(sdk.functions)} functions`, STATUS.object[1]],
    bytes
      ? [`${percent(bytes.typed, bytes.bytes, 2)}%`, "Data typed in C", `${number(bytes.typed)} of ${number(bytes.bytes)} B`, STATUS.asm[1]]
      : ["n/a", "Data typed in C", "not measured", MUTED],
  ];
  const width = (WIDTH - 2 * MARGIN - 3 * GAP) / 4;
  let svg = "";
  items.forEach(([big, title, sub, color], index) => {
    const x = MARGIN + index * (width + GAP);
    svg += rect(x, y, width, 92, "#161b22") + frame(x + 0.5, y + 0.5, width - 1, 91, OUTLINE);
    svg += text(x + 16, y + 9, title, 15, INK);
    svg += text(x + 16, y + 34, big, 44, color, { weight: "bold" });
    svg += text(x + 16 + textWidth(big, 44) * 1.18 + 14, y + 56, sub, 14, MUTED);
  });
  return { svg, bottom: y + 92 };
}

// The status legend, one row per status with its function count and code share.
function legend(data, x, y, width) {
  const totals = data.summary.code;
  let svg = text(x, y, "Status of every function", 24, INK);
  ORDER.forEach((key, index) => {
    const [functions, bytes] = totals.statuses[key];
    const top = y + 40 + index * 38;
    svg += rect(x, top + 2, 20, 20, STATUS[key][1]);
    svg += text(x + 30, top - 2, STATUS[key][0], 16, INK);
    svg += text(x + 30, top + 17, `${number(functions)} functions · ${percent(bytes, totals.bytes, 1)}% of code bytes`, 12, MUTED);
  });
  return { svg, bottom: y + 40 + ORDER.length * 38 };
}

// A horizontal bar of parts [value, colour] against a total.
function bar(x, y, width, height, parts, total) {
  let svg = rect(x, y, width, height, TRACK);
  let at = x;
  for (const [value, color] of parts) {
    const w = total ? (value / total) * width : 0;
    if (w > 0) svg += rect(at, y, w, height, color);
    at += w;
  }
  return svg;
}

// Data panel: per target, the share of data bytes typed in C.
function dataTitle(data) {
  const total = data.summary.data;
  return total ? `Data: ${percent(total.typed, total.bytes)}% typed in C (${number(total.typed)} / ${number(total.bytes)} B)` : "Data";
}

function dataPanel(data, x, y, width, titled = true) {
  const rows = data.targets.filter((t) => t.data && t.data.bytes).sort((a, b) => b.data.bytes - a.data.bytes);
  const head = titled ? 40 : 0;
  let svg = titled ? text(x, y, dataTitle(data), 24, INK) : "";
  const nameWidth = 180;
  const valueWidth = 250;
  const barWidth = width - nameWidth - valueWidth - 16;
  rows.forEach((t, index) => {
    const top = y + head + index * 22;
    // The full bar is the target's data bytes; the green part is the share typed in C.
    svg += text(x, top, t.name, 13, INK);
    svg += bar(x + nameWidth, top + 1, barWidth, 14, [[t.data.typed, STATUS.pure[1]]], t.data.bytes);
    svg += text(x + width, top, `${percent(t.data.typed, t.data.bytes, 1)}% · ${number(t.data.typed)} / ${number(t.data.bytes)} B`, 13, MUTED, { anchor: "end" });
  });
  return { svg, bottom: y + head + rows.length * 22 };
}

// Library panel: per PsyQ library, its functions by status and the versions it links from.
const LIBRARY_TITLE = "PsyQ libraries and versions";

function libraryPanel(data, x, y, width, titled = true) {
  const sdk = data.summary.sdk;
  const head = titled ? 40 : 0;
  let svg = titled ? text(x, y, LIBRARY_TITLE, 24, INK) : "";
  const libs = data.libraries.filter((lib) => lib.functions.length > 2);
  const peak = Math.max(...libs.map((lib) => weightOf(lib.functions)), 1);
  const nameWidth = 70;
  const barWidth = width - nameWidth - 96;
  libs.forEach((lib, index) => {
    const top = y + head + index * 36;
    const count = Object.fromEntries(ORDER.map((key) => [key, 0]));
    for (const fn of lib.functions) count[fn.status] += 1;
    const done = count.pure + count.aided + count.object;
    const length = Math.max((weightOf(lib.functions) / peak) * barWidth, 2);
    svg += text(x, top, lib.name, 14, INK);
    svg += bar(x + nameWidth, top + 1, length, 14, ORDER.map((key) => [count[key], STATUS[key][1]]), lib.functions.length);
    svg += text(x + width, top, `${number(done)} / ${number(lib.functions.length)}`, 13, MUTED, { anchor: "end" });
    const versions = Object.entries(lib.versions).map(([version, units]) => `${version} ×${units}`).join(" · ");
    svg += text(x + nameWidth, top + 18, versions ? `objects from PsyQ ${versions}` : "no object units", 11, MUTED);
  });
  const key = `${number(sdk.statuses.object[0])} objects · ${number(sdk.statuses.assembly[0])} assembly · ${number(sdk.statuses.pure[0] + sdk.statuses.aided[0])} C`;
  svg += text(x, y + head + libs.length * 36, key, 13, MUTED);
  return { svg, bottom: y + head + libs.length * 36 + 22 };
}

// Quality row: the counters of bin/status.
function qualityRow(data, y) {
  const q = data.summary.quality;
  const items = [
    ["Aids in use", number(q.aids), `${number(q.benign_aids)} benign · ${number(q.harmful_aids)} harmful`],
    ["FIELD uses", number(q.field_ref), "raw offset accesses"],
    ["Local externs", number(q.local_externs), "extern declarations in C files"],
    ["Symbol conflicts", number(q.sym_conflicts), "symbol registry disagreements"],
    ["Hand assembly", number(q.hand_asm), "files in the hand folders"],
  ];
  const width = (WIDTH - 2 * MARGIN - 4 * GAP) / 5;
  let svg = text(MARGIN, y, "Code quality", 24, INK);
  items.forEach(([name, value, sub], index) => {
    const x = MARGIN + index * (width + GAP);
    const top = y + 40;
    svg += rect(x, top, width, 70, "#161b22") + frame(x + 0.5, top + 0.5, width - 1, 69, OUTLINE);
    svg += text(x + 14, top + 8, value, 30, INK, { weight: "bold" });
    svg += text(x + 14 + textWidth(value, 30) * 1.18 + 12, top + 10, name, 15, INK);
    svg += text(x + 14, top + 46, sub, 12, MUTED);
  });
  return { svg, bottom: y + 40 + 70 };
}

// One line chart of a history series; points are [date, value].
function chart(title, points, x, y, width, height, color, format) {
  let svg = text(x, y, `${title}: ${points.length ? format(points[points.length - 1][1]) : "no data yet"}`, 16, INK);
  const plot = [x + 4, y + 30, x + width - 6, y + height - 22];
  svg += rect(plot[0], plot[1], plot[2] - plot[0], plot[3] - plot[1], "#161b22");
  if (!points.length) return svg;
  const days = points.map(([date]) => Date.parse(date) / 864e5);
  const span = Math.max(days[days.length - 1] - days[0], 1);
  const high = Math.max(...points.map(([, value]) => value)) || 1;
  const at = points.map(([, value], index) => [
    plot[0] + ((days[index] - days[0]) / span) * (plot[2] - plot[0]),
    plot[3] - (value / high) * (plot[3] - plot[1]),
  ]);
  if (at.length > 1) svg += `<polyline points="${at.map(([px, py]) => `${round(px)},${round(py)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`;
  const [lx, ly] = at[at.length - 1];
  svg += `<circle cx="${round(lx)}" cy="${round(ly)}" r="4.5" fill="${color}"/>`;
  svg += text(plot[0], y + height - 17, points[0][0], 12, MUTED);
  svg += text(plot[2], y + height - 17, points[points.length - 1][0], 12, MUTED, { anchor: "end" });
  return svg;
}

// Points of a history field: shares drop days before the first matched work, counts drop unmeasured days.
function series(history, pick, { trimZero = false } = {}) {
  const points = history.map((row) => [row.date, pick(row)]).filter(([, value]) => value !== null && Number.isFinite(value));
  const first = trimZero ? points.findIndex(([, value]) => value > 0) : 0;
  return first < 0 ? [] : points.slice(trimZero ? Math.max(first - 1, 0) : 0);
}

function trends(data, y, { x = MARGIN, width: total = WIDTH - 2 * MARGIN, cols = 4, titled = true } = {}) {
  const h = data.history;
  const ratio = (num, den) => (row) => (row[den] && row[num] !== null ? (100 * row[num]) / row[den] : null);
  const count = (key) => (row) => row[key];
  const share1 = (value) => `${value.toFixed(1)}%`;
  const share2 = (value) => `${value.toFixed(2)}%`;
  const whole = (value) => number(value);
  const charts = [
    ["Matched functions over time", series(h, ratio("game_matched", "game_functions"), { trimZero: true }), STATUS.pure[1], share1],
    ["Matched code bytes over time", series(h, ratio("game_matched_bytes", "game_bytes"), { trimZero: true }), STATUS.pure[1], share1],
    ["PsyQ SDK as object or C over time", series(h, ratio("sdk_done", "sdk_functions")), STATUS.object[1], share1],
    ["Data typed in C over time", series(h, ratio("data_typed", "data_bytes")), STATUS.asm[1], share2],
    ["Aids in use over time", series(h, count("aids")), MUTED, whole],
    ["Harmful aids over time", series(h, count("harmful_aids")), STATUS.nonmatching[1], whole],
    ["FIELD uses over time", series(h, count("field_ref")), MUTED, whole],
    ["Local externs over time", series(h, count("local_externs")), MUTED, whole],
  ];
  const width = (total - (cols - 1) * GAP) / cols;
  const height = 170;
  const head = titled ? 40 : 0;
  const rows = Math.ceil(charts.length / cols);
  let svg = titled ? text(x, y, "Trend", 24, INK) : "";
  charts.forEach(([title, points, color, format], index) => {
    const [row, col] = [Math.floor(index / cols), index % cols];
    svg += chart(title, points, x + col * (width + GAP), y + head + row * (height + 16), width, height, color, format);
  });
  return { svg, bottom: y + head + rows * (height + 16) - 16 };
}

export function render(data) {
  let svg = "";
  const date = data.generated_at.slice(0, 10);
  svg += text(MARGIN, MARGIN - 4, "Breath of Fire III decompilation status", 34, INK, { weight: "bold" });
  svg += text(MARGIN, MARGIN + 38, `rebof3 ${data.commit.slice(0, 7)} · ${date} · block area is code bytes, one square per function`, 15, MUTED);
  const top = cards(data, MARGIN + 70);
  svg += top.svg;

  const game = gamePanel(data);
  const left = panel(game.title, game.blocks, MARGIN, top.bottom + GAP + 6, GAME_WIDTH, 1);
  const right = MARGIN + GAME_WIDTH + GAP;
  const sdk = sdkPanel(data);
  const side = panel(sdk.title, sdk.blocks, right, top.bottom + GAP + 6, SIDE_WIDTH, SDK_SCALE);
  svg += left.svg + side.svg;
  svg += legend(data, right, side.bottom + GAP, SIDE_WIDTH).svg;
  const legendBottom = side.bottom + GAP + 40 + ORDER.length * 38;

  const rowTop = Math.max(left.bottom, legendBottom) + 2 * GAP;
  const dataBox = dataPanel(data, MARGIN, rowTop, GAME_WIDTH);
  const libBox = libraryPanel(data, right, rowTop, SIDE_WIDTH);
  svg += dataBox.svg + libBox.svg;

  const qualityTop = Math.max(dataBox.bottom, libBox.bottom) + 2 * GAP;
  const quality = qualityRow(data, qualityTop);
  svg += quality.svg;
  const trend = trends(data, quality.bottom + 2 * GAP);
  svg += trend.svg;

  const height = Math.ceil(trend.bottom + MARGIN);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}"` +
    ` font-family="${FONT}" role="img" aria-label="Decompilation status board">` +
    `<rect width="${WIDTH}" height="${height}" fill="${BACKGROUND}"/>${svg}</svg>`
  );
}

// The README badge: "C match" and the share of game functions matched.
export function badge(data) {
  const game = data.summary.game;
  const value = `${percent(game.done_functions, game.functions, 1)}%`;
  const key = "C match";
  const [kw, vw] = [textWidth(key, 11) + 14, textWidth(value, 11) + 14];
  const high = share(game.done_functions, game.functions);
  const color = high >= 66 ? "#2ea043" : high >= 33 ? "#d29922" : "#b3402f";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(kw + vw)}" height="20" role="img" aria-label="${key}: ${value}" font-family="${FONT}" font-size="11">` +
    `<rect width="${round(kw)}" height="20" fill="#555"/><rect x="${round(kw)}" width="${round(vw)}" height="20" fill="${color}"/>` +
    `<g fill="#fff" text-anchor="middle"><text x="${round(kw / 2)}" y="14">${key}</text><text x="${round(kw + vw / 2)}" y="14">${value}</text></g></svg>`
  );
}

// Page ---------------------------------------------------------------------------------

const PAGE_WIDTH = 1020;

const fragment = (svg, height, label) =>
  `<svg class="map" viewBox="0 0 ${PAGE_WIDTH} ${Math.ceil(height)}" role="img" aria-label="${escape(label)}">${svg}</svg>`;

// Matched share of game code per area: the executables, then each EMI family.
function areas(data) {
  const found = new Map();
  for (const target of data.targets) {
    if (!target.functions.length) continue;
    const key = target.id === "exe/logo" ? "logo" : target.id.startsWith("exe/") ? "EXE" : target.id.split("/").slice(0, 2).join("/");
    const entry = found.get(key) ?? [0, 0];
    entry[1] += target.functions.length;
    entry[0] += target.functions.filter((fn) => ["pure", "aided", "asm"].includes(fn.status)).length;
    found.set(key, entry);
  }
  return [...found].map(([label, [done, total]]) => [label, share(done, total)]);
}

const badgeHtml = (label, value, kind) => `<span class="badge"><b>${escape(label)}</b><i class="${kind}">${escape(value)}</i></span>`;
const level = (value) => (value >= 66 ? "" : value >= 33 ? "mid" : "low");

export function page(data) {
  const { game, sdk, data: bytes, quality } = data.summary;
  const gameShare = share(game.done_functions, game.functions);
  const badges = [
    badgeHtml("game code*", `${gameShare.toFixed(2)}%`, level(gameShare)),
    ...areas(data).map(([label, value]) => badgeHtml(label, `${value.toFixed(2)}%`, level(value))),
    badgeHtml("PsyQ SDK", `${percent(sdk.done_functions, sdk.functions)}%`, "lib"),
    bytes ? badgeHtml("data typed", `${percent(bytes.typed, bytes.bytes)}%`, level(share(bytes.typed, bytes.bytes))) : "",
    badgeHtml("aids", number(quality.aids), "lib"),
    badgeHtml("FIELD uses", number(quality.field_ref), "lib"),
    badgeHtml("local externs", number(quality.local_externs), "lib"),
    badgeHtml("symbol conflicts", number(quality.sym_conflicts), "lib"),
  ].join("");
  const legendHtml = ORDER.map((key) => `<span style="--c:${STATUS[key][1]}">${escape(STATUS[key][0])}</span>`).join("");
  const gameBox = gamePanel(data);
  const gameDraw = panel(null, gameBox.blocks, 0, 0, PAGE_WIDTH, 1);
  const sdkBox = sdkPanel(data);
  const sdkDraw = panel(null, sdkBox.blocks, 0, 0, PAGE_WIDTH, SDK_SCALE);
  const dataDraw = dataPanel(data, 0, 0, PAGE_WIDTH, false);
  const libDraw = libraryPanel(data, 0, 0, PAGE_WIDTH, false);
  const trendDraw = trends(data, 0, { x: 0, width: PAGE_WIDTH, cols: 2, titled: false });
  const q = quality;
  return (
    `<h1>Breath of Fire III (US): decompilation status</h1>` +
    `<p class="mute">Generated ${escape(data.generated_at.slice(0, 10))} at <code>${escape(data.commit.slice(0, 12))}</code>.` +
    ` <a href="progress.json">progress.json</a> · <a href="progress.png">progress.png</a></p>` +
    `<div class="badges">${badges}</div>` +
    `<p class="mute small">* Game code is every function outside the PsyQ SDK. Matched means byte-exact: matched C, matched C with aids and original assembly.` +
    ` The SDK counts a unit as done when it links from an original object or is exact C.</p>` +
    `<div class="legend">${legendHtml}</div>` +
    `<h2>${escape(gameBox.title)}</h2><p class="mute small">Block area is code bytes; one square per function. Hover a square for its function.</p>` +
    fragment(gameDraw.svg, gameDraw.bottom, gameBox.title) +
    `<h2>${escape(sdkBox.title)}</h2><p class="mute small">One block per PsyQ library, linked from original objects (teal) or assembly (orange), or written as C (green).</p>` +
    fragment(sdkDraw.svg, sdkDraw.bottom, sdkBox.title) +
    `<h2>${escape(dataTitle(data))}</h2><p class="mute small">Each bar is a target's data bytes; green is typed in C.</p>` +
    fragment(dataDraw.svg, dataDraw.bottom, "Data typed in C per target") +
    `<h2>${LIBRARY_TITLE}</h2><p class="mute small">Functions by status per library; the versions are the PsyQ releases the object units link from.</p>` +
    fragment(libDraw.svg, libDraw.bottom, LIBRARY_TITLE) +
    `<h2>Code quality</h2><p class="mute small">${number(q.aids)} aids in use (${number(q.benign_aids)} benign, ${number(q.harmful_aids)} harmful), ${number(q.field_ref)} FIELD uses (raw offset accesses),` +
    ` ${number(q.local_externs)} local externs, ${number(q.sym_conflicts)} symbol conflicts, ${number(q.hand_asm)} hand assembly files.</p>` +
    `<h2>Trend</h2>` +
    fragment(trendDraw.svg, trendDraw.bottom, "Trend") +
    `<p class="small mute">Machine output: <a href="progress.json">progress.json</a>. This page is generated from it; do not edit by hand.</p>`
  );
}

// In a page: fetch progress.json and draw it.
if (typeof document !== "undefined") {
  const host = document.getElementById("page");
  fetch("progress.json")
    .then((response) => response.json())
    .then((data) => {
      host.innerHTML = page(data);
    })
    .catch((error) => {
      host.textContent = `progress.json did not load: ${error.message}`;
    });
}
