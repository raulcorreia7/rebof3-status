// Status board for the Breath of Fire III decompilation.
//
// render(data) turns progress.json into one SVG string: the same string becomes progress.svg and
// progress.png (build.mjs). page(data) returns the web page. badge(data) returns the README badge.
// It runs in a browser and in Node; layout.js places the map rectangles with the vendored
// d3-hierarchy treemap.

import { treemapLayout } from "./layout.js";

const WIDTH = 1600;
const MARGIN = 24;
const GAP = 20;
const MAP_WIDTH = 1020;
const SIDE_WIDTH = WIDTH - 2 * MARGIN - MAP_WIDTH - GAP;
const PAGE_WIDTH = 1020;
const FONT = "'DejaVu Sans', Verdana, Arial, sans-serif";

// Address map: one treemap of every target, area in proportion to bytes.
const MAP_HEIGHT = 640; // smallest picture map; render() grows it to the height of the side column
const TARGET_LABEL_LINE = 14; // pixels per line of a target label
const TARGET_LABEL_BAR = 16; // label background covering one line

const BACKGROUND = "#0d1117";
const OUTLINE = "#30363d";
const INK = "#c9d1d9";
const MUTED = "#8b949e";
const TRACK = "#21262d";
const CARD = "#161b22";

// Function status -> [legend text, colour], finished work first.
const STATUS = {
  pure: ["matched C", "#2ea043"],
  aided: ["matched C with aids", "#7ee787"],
  asm: ["original assembly (exact)", "#79c0ff"],
  object: ["library object", "#26a69a"],
  assembly: ["library assembly", "#db6d28"],
  nonmatching: ["in progress (C, not yet exact)", "#d29922"],
  open: ["assembly", "#4b535d"],
};
// Map rows that are not functions.
const DATA_STATUS = {
  typed: ["data typed in C", "#a371f7"],
  raw: ["data and raw bytes", "#30363d"],
  header: ["file header", "#6e7681"],
};
const LABEL = { ...STATUS, ...DATA_STATUS };
const ORDER = Object.keys(STATUS);
const DONE = ["pure", "aided", "asm"];

// PsyQ match tier -> [legend text, colour], best first (the order of libraries[].tiers).
const TIER = {
  c: ["exact C", STATUS.pure[1]],
  object: ["exact object", STATUS.object[1]],
  partial: ["partial match", "#e3b341"],
  assembly: ["assembly only", STATUS.assembly[1]],
  unmatched: ["unmatched", STATUS.open[1]],
};
const TIER_ORDER = Object.keys(TIER);

const LINK_COLOR = { EXACT: STATUS.pure[1], DIFFERS: "#f85149", ERROR: "#f85149" };

const number = (value) => value.toLocaleString("en-US");
const share = (done, total) => (total ? (100 * done) / total : 0);
const percent = (done, total, digits = 2) => share(done, total).toFixed(digits);
const round = (value) => Math.round(value * 100) / 100;
const hex = (value) => `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
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
function text(x, y, content, size, fill, { anchor = "start", weight = "normal" } = {}) {
  return (
    `<text x="${round(x)}" y="${round(y + size * 0.8)}" font-size="${size}" fill="${fill}"` +
    ` text-anchor="${anchor}" font-weight="${weight}">${escape(content)}</text>`
  );
}

const rect = (x, y, w, h, fill, inner = "") => {
  const box = `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${fill}"`;
  return inner ? `${box}>${inner}</rect>` : `${box}/>`;
};

const frame = (x, y, w, h, color) =>
  `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="none" stroke="${color}"/>`;

const heading = (x, y, title) => text(x, y, title, 24, INK);

// Address map ----------------------------------------------------------------------------

const targetBytes = (target) => parseInt(target.end, 16) - parseInt(target.base, 16);

// Executables first, then the overlays in id order.
const mapOrder = (data) =>
  [...data.targets].sort((a, b) => Number(b.id.startsWith("exe/")) - Number(a.id.startsWith("exe/")) || a.id.localeCompare(b.id));

function unitTip(target, base, [offset, size, kind, status, name]) {
  const id = kind === "d" ? `${target.id}+${hex(base + offset)}` : `${target.id}@${hex(base + offset)}`;
  const note = kind === "s" ? " · PsyQ" : "";
  return `${id} ${name} · ${LABEL[status][0]}${note} · ${number(size)} B`;
}

// A target's label, drawn over a dark bar so it stays readable on any status colour. It fits
// when its name fits; the address line is added only when the rectangle has room for both.
function targetLabel({ x, y, w, h }, target) {
  const base = parseInt(target.base, 16);
  const name = target.name;
  const detail = `${target.id} · ${hex(base)} · ${number(targetBytes(target))} B`;
  const nameWidth = textWidth(name, 12) + 10;
  if (w < nameWidth || h < TARGET_LABEL_BAR) return "";
  const wide = w >= textWidth(detail, 10) + 10 && h >= 2 * TARGET_LABEL_LINE;
  const width = Math.min(w, wide ? Math.max(nameWidth, textWidth(detail, 10) + 10) : nameWidth);
  const height = wide ? 2 * TARGET_LABEL_LINE : TARGET_LABEL_BAR;
  return (
    `<g pointer-events="none">` +
    `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${height}"` +
    ` fill="${BACKGROUND}" fill-opacity="0.82"/>` +
    text(x + 5, y + 1, name, 12, INK, { weight: "bold" }) +
    (wide ? text(x + 5, y + TARGET_LABEL_LINE + 1, detail, 10, MUTED) : "") +
    `</g>`
  );
}

// Every target as one rectangle of the treemap, its units inside. Area is bytes, so a target or
// a row that is small in memory is small on screen, and address order runs through the map.
function addressMap(data, x, y, width, height = MAP_HEIGHT) {
  const map = treemapLayout(data.targets, width, height);
  let svg = `<g transform="translate(${round(x)} ${round(y)})">`;
  for (const { target, unit, x: left, y: top, w, h } of map.units) {
    const base = parseInt(target.base, 16);
    svg += rect(left, top, w, h, LABEL[unit[3]][1], `<title>${escape(unitTip(target, base, unit))}</title>`);
  }
  for (const frameRect of map.targets) {
    svg += frame(frameRect.x, frameRect.y, frameRect.w, frameRect.h, BACKGROUND);
    svg += targetLabel(frameRect, frameRect.target);
  }
  return { svg: `${svg}</g>`, bottom: y + height };
}

// Cards, legend, bars ----------------------------------------------------------------------

// Four headline cards: big share, then what it counts.
function cards(data, y) {
  const { game, sdk, data: bytes } = data.summary;
  const items = [
    [`${percent(game.done_functions, game.functions, 1)}%`, "Game code matched", `${number(game.done_functions)} of ${number(game.functions)} functions`, STATUS.pure[1]],
    [`${percent(game.done_bytes, game.bytes, 1)}%`, "Game code bytes matched", `${number(game.done_bytes)} of ${number(game.bytes)} B`, STATUS.pure[1]],
    [`${percent(sdk.done_functions, sdk.functions, 1)}%`, "PsyQ SDK as object or C", `${number(sdk.done_functions)} of ${number(sdk.functions)} functions`, STATUS.object[1]],
    bytes
      ? [`${percent(bytes.typed, bytes.bytes, 2)}%`, "Data typed in C", `${number(bytes.typed)} of ${number(bytes.bytes)} B`, DATA_STATUS.typed[1]]
      : ["from next run", "Data typed in C", "measured by bin/progress", MUTED],
  ];
  const width = (WIDTH - 2 * MARGIN - 3 * GAP) / 4;
  let svg = "";
  items.forEach(([big, title, sub, color], index) => {
    const x = MARGIN + index * (width + GAP);
    svg += rect(x, y, width, 92, CARD) + frame(x + 0.5, y + 0.5, width - 1, 91, OUTLINE);
    svg += text(x + 16, y + 9, title, 15, INK);
    svg += text(x + 16, y + 34, big, 44, color, { weight: "bold" });
    svg += text(x + 16 + textWidth(big, 44) * 1.18 + 14, y + 56, sub, 14, MUTED);
  });
  return { svg, bottom: y + 92 };
}

// The status legend, one row per status with its function count and code share.
function legend(data, x, y) {
  const totals = data.summary.code;
  let svg = heading(x, y, "Status of every function");
  ORDER.forEach((key, index) => {
    const [functions, bytes] = totals.statuses[key];
    const top = y + 40 + index * 38;
    svg += rect(x, top + 2, 20, 20, STATUS[key][1]);
    svg += text(x + 30, top - 2, STATUS[key][0], 16, INK);
    svg += text(x + 30, top + 17, `${number(functions)} functions · ${percent(bytes, totals.bytes, 1)}% of code bytes`, 12, MUTED);
  });
  let at = y + 40 + ORDER.length * 38;
  for (const [, [name, color]] of Object.entries(DATA_STATUS)) {
    svg += rect(x, at + 2, 20, 20, color) + text(x + 30, at + 2, name, 16, INK);
    at += 30;
  }
  return { svg, bottom: at };
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

function dataTitle(data) {
  const total = data.summary.data;
  return total ? `Data: ${percent(total.typed, total.bytes)}% typed in C (${number(total.typed)} / ${number(total.bytes)} B)` : "Data";
}

// Data panel: per target, the share of data bytes typed in C. Compact drops the byte counts.
function dataPanel(data, x, y, width, { titled = true, compact = false } = {}) {
  const rows = data.targets.filter((t) => t.data && t.data.bytes).sort((a, b) => b.data.bytes - a.data.bytes);
  const head = titled ? 40 : 0;
  let svg = titled ? heading(x, y, compact ? "Data typed in C" : dataTitle(data)) : "";
  const nameWidth = compact ? 150 : 180;
  const valueWidth = compact ? 52 : 250;
  const barWidth = width - nameWidth - valueWidth - 16;
  rows.forEach((t, index) => {
    const top = y + head + index * 22;
    const value = compact ? `${percent(t.data.typed, t.data.bytes, 1)}%` : `${percent(t.data.typed, t.data.bytes, 1)}% · ${number(t.data.typed)} / ${number(t.data.bytes)} B`;
    svg += text(x, top, t.name, 13, INK);
    svg += bar(x + nameWidth, top + 1, barWidth, 14, [[t.data.typed, DATA_STATUS.typed[1]]], t.data.bytes);
    svg += text(x + width, top, value, 13, MUTED, { anchor: "end" });
  });
  return { svg, bottom: y + head + rows.length * 22 };
}

// PsyQ libraries --------------------------------------------------------------------------

const LIBRARY_TITLE = "PsyQ libraries, best match first";
const LIBRARY_ROW = 40;

const libraryDone = (lib) => lib.tiers.c + lib.tiers.object;

// The PsyQ versions the library's exact objects link from, as "4.0 x198 · 4.7 x177".
const versionText = (lib) =>
  Object.entries(lib.versions)
    .map(([version, units]) => `${version} ×${units}`)
    .join(" · ");

function libraryNote(lib) {
  const parts = [];
  const versions = versionText(lib);
  if (versions) parts.push(`objects from PsyQ ${versions}`);
  if (lib.tiers.partial) parts.push(`${lib.tiers.partial} partial`);
  if (lib.tiers.assembly) parts.push(`${lib.tiers.assembly} assembly only`);
  if (lib.tiers.unmatched) parts.push(`${lib.tiers.unmatched} unmatched`);
  return parts.join(" · ") || "no match";
}

function tierLegend(x, y) {
  let svg = "";
  let at = x;
  for (const key of TIER_ORDER) {
    svg += rect(at, y + 2, 10, 10, TIER[key][1]) + text(at + 15, y, TIER[key][0], 12, MUTED);
    at += 15 + textWidth(TIER[key][0], 12) + 14;
  }
  return svg;
}

function libraryPanel(data, x, y, width, titled = true) {
  const head = titled ? 40 : 0;
  let svg = titled ? heading(x, y, LIBRARY_TITLE) : "";
  svg += tierLegend(x, y + head);
  const libs = data.libraries;
  const peak = Math.max(...libs.map((lib) => lib.functions.length), 1);
  const nameWidth = 78;
  const countWidth = 70;
  const barWidth = width - nameWidth - countWidth;
  const top0 = y + head + 24;
  libs.forEach((lib, index) => {
    const top = top0 + index * LIBRARY_ROW;
    const length = Math.max((lib.functions.length / peak) * barWidth, 2);
    svg += text(x, top, lib.name, 14, INK);
    svg += bar(x + nameWidth, top + 1, length, 14, TIER_ORDER.map((key) => [lib.tiers[key], TIER[key][1]]), lib.functions.length);
    svg += text(x + width, top, `${number(libraryDone(lib))} / ${number(lib.functions.length)}`, 13, MUTED, { anchor: "end" });
    svg += text(x + nameWidth, top + 19, libraryNote(lib), 11, MUTED);
  });
  const sdk = data.summary.sdk;
  const key = `${number(sdk.statuses.object[0])} objects · ${number(sdk.statuses.assembly[0])} assembly · ${number(sdk.statuses.pure[0] + sdk.statuses.aided[0])} C · done = exact C or exact object`;
  svg += text(x, top0 + libs.length * LIBRARY_ROW, key, 12, MUTED);
  return { svg, bottom: top0 + libs.length * LIBRARY_ROW + 22 };
}

// Quality and trend -------------------------------------------------------------------------

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
  let svg = heading(MARGIN, y, "Code quality");
  items.forEach(([name, value, sub], index) => {
    const x = MARGIN + index * (width + GAP);
    const top = y + 40;
    svg += rect(x, top, width, 70, CARD) + frame(x + 0.5, top + 0.5, width - 1, 69, OUTLINE);
    svg += text(x + 14, top + 8, value, 30, INK, { weight: "bold" });
    svg += text(x + 14 + textWidth(value, 30) * 1.18 + 12, top + 10, name, 15, INK);
    svg += text(x + 14, top + 46, sub, 12, MUTED);
  });
  return { svg, bottom: y + 40 + 70 };
}

// One line chart of a history series; points are [date, value].
function chart(title, points, x, y, width, height, color, format) {
  let svg = text(x, y, points.length ? `${title}: ${format(points[points.length - 1][1])}` : title, 16, INK);
  const plot = [x + 4, y + 30, x + width - 6, y + height - 22];
  svg += rect(plot[0], plot[1], plot[2] - plot[0], plot[3] - plot[1], CARD);
  if (!points.length) return svg + text(plot[0] + 12, plot[1] + 12, "starts with the next published run", 13, MUTED);
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
  const charts = [
    ["Matched functions over time", series(h, ratio("game_matched", "game_functions"), { trimZero: true }), STATUS.pure[1], share1],
    ["Matched code bytes over time", series(h, ratio("game_matched_bytes", "game_bytes"), { trimZero: true }), STATUS.pure[1], share1],
    ["PsyQ SDK as object or C over time", series(h, ratio("sdk_done", "sdk_functions")), STATUS.object[1], share1],
    ["Data typed in C over time", series(h, ratio("data_typed", "data_bytes")), DATA_STATUS.typed[1], share2],
    ["Aids in use over time", series(h, count("aids")), MUTED, number],
    ["Harmful aids over time", series(h, count("harmful_aids")), STATUS.nonmatching[1], number],
    ["FIELD uses over time", series(h, count("field_ref")), MUTED, number],
    ["Local externs over time", series(h, count("local_externs")), MUTED, number],
  ];
  const width = (total - (cols - 1) * GAP) / cols;
  const height = 170;
  const head = titled ? 40 : 0;
  const rows = Math.ceil(charts.length / cols);
  let svg = titled ? heading(x, y, "Trend") : "";
  charts.forEach(([title, points, color, format], index) => {
    const [row, col] = [Math.floor(index / cols), index % cols];
    svg += chart(title, points, x + col * (width + GAP), y + head + row * (height + 16), width, height, color, format);
  });
  return { svg, bottom: y + head + rows * (height + 16) - 16 };
}

// Picture and badge -------------------------------------------------------------------------

const MAP_TITLE = "Game and PsyQ code at its address";

export function render(data) {
  let svg = "";
  const date = data.generated_at.slice(0, 10);
  svg += text(MARGIN, MARGIN - 4, "Breath of Fire III decompilation status", 34, INK, { weight: "bold" });
  svg += text(MARGIN, MARGIN + 38, `rebof3 ${data.commit.slice(0, 7)} · ${date} · every function and data row at its address, coloured by status`, 15, MUTED);
  const top = cards(data, MARGIN + 70);
  svg += top.svg;

  const start = top.bottom + GAP + 6;
  svg += heading(MARGIN, start, MAP_TITLE);
  const right = MARGIN + MAP_WIDTH + GAP;
  const key = legend(data, right, start);
  const libs = libraryPanel(data, right, key.bottom + GAP, SIDE_WIDTH);
  const bytes = dataPanel(data, right, libs.bottom + GAP, SIDE_WIDTH, { compact: true });
  const mapTop = start + 44;
  const map = addressMap(data, MARGIN, mapTop, MAP_WIDTH, Math.max(MAP_HEIGHT, bytes.bottom - mapTop));
  svg += map.svg + key.svg + libs.svg + bytes.svg;

  const quality = qualityRow(data, Math.max(map.bottom, bytes.bottom) + 2 * GAP);
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

// Page ---------------------------------------------------------------------------------------

const fragment = (svg, height, label) =>
  `<svg class="map" viewBox="0 0 ${PAGE_WIDTH} ${Math.ceil(height)}" role="img" aria-label="${escape(label)}">${svg}</svg>`;

// Matched share of game code per area: the executables, then each EMI family.
function areas(data) {
  const found = new Map();
  for (const target of data.targets) {
    const game = target.units.filter((u) => u[2] === "f");
    if (!game.length) continue;
    const key = target.id === "exe/logo" ? "logo" : target.id.startsWith("exe/") ? "EXE" : target.id.split("/").slice(0, 2).join("/");
    const entry = found.get(key) ?? [0, 0];
    entry[1] += game.length;
    entry[0] += game.filter((u) => DONE.includes(u[3])).length;
    found.set(key, entry);
  }
  return [...found].map(([label, [done, total]]) => [label, share(done, total)]);
}

const badgeHtml = (label, value, kind) => `<span class="badge"><b>${escape(label)}</b><i class="${kind}">${escape(value)}</i></span>`;
const level = (value) => (value >= 66 ? "" : value >= 33 ? "mid" : "low");

function linkBadge(links) {
  if (!links) return "";
  return badgeHtml("image links", `${links.exact}/${links.targets} exact`, links.exact === links.targets ? "" : "low");
}

// The verification section: image links and the audit of the units against the Splat maps.
function verification(data) {
  const { links, layout } = data.summary;
  const differing = data.targets.filter((t) => t.link && t.link.status !== "EXACT");
  const lines = [];
  if (links) {
    const names = differing.map((t) => `${t.id}${t.link.first_mismatch === null || t.link.first_mismatch === undefined ? "" : ` (first difference at ${hex(parseInt(t.base, 16) + t.link.first_mismatch)})`}`);
    lines.push(
      `<b>Image links:</b> ${links.exact} of ${links.targets} targets link byte-identical to the retail binary` +
        (names.length ? `; ${escape(names.join(", "))} ${names.length > 1 ? "differ" : "differs"}.` : "."),
    );
  } else {
    lines.push("<b>Image links:</b> not measured in this run.");
  }
  lines.push(
    `<b>Address map:</b> ${number(layout.rows)} map rows; ${layout.gaps} gaps and ${layout.overlaps} overlaps between rows;` +
      ` ${layout.problems} differences that touch code.` +
      (layout.relocated || layout.unmodelled || layout.resized
        ? ` Against these rows, the units behind bin/status place ${layout.relocated} raw rows of the executables at another address, lack ${layout.unmodelled} rows of top-level segments and size ${layout.resized} data rows too large. None of them is a function.`
        : ""),
  );
  return lines.map((line) => `<p class="small">${line}</p>`).join("");
}

function targetRow(target) {
  const game = target.units.filter((u) => u[2] === "f");
  const matched = game.filter((u) => DONE.includes(u[3])).length;
  const verdict = target.link ? target.link.status : null;
  const pill = verdict ? `<span class="pill" style="--c:${LINK_COLOR[verdict]}">${verdict}</span>` : `<span class="mute">not linked</span>`;
  const audit = target.layout;
  const notes = [audit.gaps.length && `${audit.gaps.length} gaps`, audit.overlaps.length && `${audit.overlaps.length} overlaps`, audit.problems.length && `${audit.problems.length} problems`].filter(Boolean);
  return (
    `<tr><td>${escape(target.name)}<br><code class="mute">${escape(target.id)}</code></td>` +
    `<td><code>${target.base}-${target.end}</code></td><td class="r">${number(targetBytes(target))}</td>` +
    `<td class="r">${game.length ? `${number(matched)} / ${number(game.length)}` : "-"}</td><td>${pill}</td>` +
    `<td>${notes.length ? escape(notes.join(", ")) : "clean"}</td></tr>`
  );
}

function targetTable(data) {
  return (
    `<div class="scroll"><table><thead><tr><th>target</th><th>address range</th><th class="r">bytes</th>` +
    `<th class="r">game matched</th><th>image link</th><th>map audit</th></tr></thead><tbody>` +
    mapOrder(data).map(targetRow).join("") +
    `</tbody></table></div>`
  );
}

// One <details> per library; wireLibraries fills its table when it is first opened.
function libraryDetails(data) {
  return data.libraries
    .map((lib, index) => {
      const versions = versionText(lib);
      const note = `${number(libraryDone(lib))} of ${number(lib.functions.length)} done${versions ? `, objects from PsyQ ${versions}` : ""}`;
      return `<details class="lib" data-lib="${index}"><summary><b>${escape(lib.name)}</b> <span class="mute">${escape(note)}</span></summary><div class="scroll"></div></details>`;
    })
    .join("");
}

function libraryTable(lib) {
  const rows = lib.functions
    .map((fn) => {
      const [name, color] = TIER[fn.tier];
      const score = fn.score === null ? "" : `${fn.score}%`;
      return (
        `<tr><td><i class="chip" style="--c:${color}"></i>${escape(name)}</td><td>${escape(fn.name)}</td>` +
        `<td><code>${escape(fn.target)}@${fn.addr}</code></td><td class="r">${number(fn.bytes)}</td>` +
        `<td>${fn.version ? `PsyQ ${escape(fn.version)}` : ""}</td><td class="r">${score}</td></tr>`
      );
    })
    .join("");
  return `<table><thead><tr><th>match</th><th>function</th><th>address</th><th class="r">bytes</th><th>version</th><th class="r">score</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function mapLegend() {
  return Object.values(LABEL)
    .map(([name, color]) => `<span style="--c:${color}">${escape(name)}</span>`)
    .join("");
}

export function page(data) {
  const { game, sdk, data: bytes, quality, links } = data.summary;
  const gameShare = share(game.done_functions, game.functions);
  const badges = [
    badgeHtml("game code*", `${gameShare.toFixed(2)}%`, level(gameShare)),
    ...areas(data).map(([label, value]) => badgeHtml(label, `${value.toFixed(2)}%`, level(value))),
    badgeHtml("PsyQ SDK", `${percent(sdk.done_functions, sdk.functions)}%`, "lib"),
    bytes ? badgeHtml("data typed", `${percent(bytes.typed, bytes.bytes)}%`, level(share(bytes.typed, bytes.bytes))) : "",
    linkBadge(links),
    badgeHtml("aids", number(quality.aids), "lib"),
    badgeHtml("FIELD uses", number(quality.field_ref), "lib"),
    badgeHtml("local externs", number(quality.local_externs), "lib"),
    badgeHtml("symbol conflicts", number(quality.sym_conflicts), "lib"),
  ].join("");
  const map = addressMap(data, 0, 0, PAGE_WIDTH);
  const dataDraw = dataPanel(data, 0, 0, PAGE_WIDTH, { titled: false });
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
    `<h2>${MAP_TITLE}</h2>` +
    `<p class="mute small">Each target is one rectangle whose area is its bytes, with its map rows inside; targets run in address order, so rectangles that neighbour on screen neighbour in memory. A row that is small in memory is a thin sliver. Hover a block for its name, <code>TARGET@0xADDRESS</code>, size and status.</p>` +
    `<div class="legend">${mapLegend()}</div>` +
    fragment(map.svg, map.bottom, MAP_TITLE) +
    `<h2>Targets and verification</h2>${verification(data)}${targetTable(data)}` +
    `<h2>${LIBRARY_TITLE}</h2><p class="mute small">One bar per library, split by how well the retail code matches PsyQ: exact C, exact object (the PsyQ version it links from), partial match, assembly only, unmatched. Open a library for its functions, best match first.</p>` +
    fragment(libDraw.svg, libDraw.bottom, LIBRARY_TITLE) +
    libraryDetails(data) +
    `<h2>${escape(dataTitle(data))}</h2><p class="mute small">Each bar is a target's data bytes; purple is typed in C.</p>` +
    fragment(dataDraw.svg, dataDraw.bottom, "Data typed in C per target") +
    `<h2>Code quality</h2><p class="mute small">${number(q.aids)} aids in use (${number(q.benign_aids)} benign, ${number(q.harmful_aids)} harmful), ${number(q.field_ref)} FIELD uses (raw offset accesses),` +
    ` ${number(q.local_externs)} local externs, ${number(q.sym_conflicts)} symbol conflicts, ${number(q.hand_asm)} hand assembly files.</p>` +
    `<h2>Trend</h2>` +
    fragment(trendDraw.svg, trendDraw.bottom, "Trend") +
    `<details><summary>Function table</summary>` +
    `<input type="search" id="q" placeholder="Filter functions" aria-label="Filter functions">` +
    `<div class="scroll"><table><thead><tr><th>function</th><th>status</th><th class="r">bytes</th></tr></thead><tbody id="rows"></tbody></table></div></details>` +
    `<p class="small mute">Machine output: <a href="progress.json">progress.json</a>. This page is generated from it; do not edit by hand.</p>`
  );
}

// Every function with its status, as rows of the filterable table.
function functionRows(data) {
  const rows = [];
  for (const target of data.targets) {
    const base = parseInt(target.base, 16);
    for (const [offset, size, kind, status, name] of target.units) {
      if (kind !== "d") rows.push({ target: target.id, addr: hex(base + offset), name, status, size });
    }
  }
  return rows.map((row) => ({
    key: `${row.target}@${row.addr} ${row.name} ${LABEL[row.status][0]}`.toLowerCase(),
    html: `<tr><td>${escape(row.target)}@${row.addr} ${escape(row.name)}</td><td><i class="chip" style="--c:${LABEL[row.status][1]}"></i>${escape(LABEL[row.status][0])}</td><td class="r">${number(row.size)}</td></tr>`,
  }));
}

// Fill the table when it is first opened and refilter on each keystroke; the first matches show.
function wireTable(data) {
  const body = document.getElementById("rows");
  const query = document.getElementById("q");
  const all = functionRows(data);
  const limit = 400;
  const show = () => {
    const words = query.value.toLowerCase().split(/\s+/).filter(Boolean);
    body.innerHTML = all.filter((row) => words.every((word) => row.key.includes(word))).slice(0, limit).map((row) => row.html).join("");
  };
  query.addEventListener("input", show);
  query.closest("details").addEventListener("toggle", show, { once: true });
}

function wireLibraries(data) {
  document.querySelectorAll("details.lib").forEach((node) => {
    node.addEventListener(
      "toggle",
      () => {
        node.querySelector(".scroll").innerHTML = libraryTable(data.libraries[Number(node.dataset.lib)]);
      },
      { once: true },
    );
  });
}

// In a page: fetch progress.json and draw it.
if (typeof document !== "undefined") {
  const host = document.getElementById("page");
  fetch("progress.json")
    .then((response) => response.json())
    .then((data) => {
      host.innerHTML = page(data);
      wireTable(data);
      wireLibraries(data);
    })
    .catch((error) => {
      host.textContent = `progress.json did not load: ${error.message}`;
    });
}
