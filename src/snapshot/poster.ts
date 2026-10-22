// progress.svg: the whole status board as one picture. render/snapshot.ts turns it into progress.png.
//
// The tiles, cards and bars are drawn here as SVG strings. The trend charts are the ECharts
// options the page uses, rendered on the server and nested into the picture.

import { renderSvg } from "../charts/ssr.ts";
import { trendOption } from "../charts/trend.ts";
import { TREND_CHARTS } from "../model/history.ts";
import { bytes, escapeText, number, percent, round } from "../model/format.ts";
import { STATUS, STATUSES } from "../model/status.ts";
import { textWidth } from "../model/text.ts";
import { DATA, MAP, POSTER, QUALITY, SDK, SUMMARY, TREND } from "../strings.ts";
import type { Fn, Model } from "../types.ts";
import { bar, C, FONT, frame, rect, text } from "./svg.ts";
import { panel, sorted, weightOf, type Block } from "./tiles.ts";

const WIDTH = 1600;
const MARGIN = 24;
const GAP = 20;
const GAME_WIDTH = 1020;
const SIDE_WIDTH = WIDTH - 2 * MARGIN - GAME_WIDTH - GAP;
// The SDK panel is drawn at this multiple of the game tile scale so its libraries stay readable.
const SDK_SCALE = 2;

interface Drawn {
  svg: string;
  bottom: number;
}

const gameBlocks = (model: Model): Block[] =>
  model.targets
    .map((target) => ({ name: target.name, rows: sorted(target.functions.filter((fn) => fn.kind === "game")) }))
    .filter((block) => block.rows.length);

const sdkBlocks = (model: Model): Block[] => model.libraries.map((lib) => ({ name: lib.name, rows: sorted(lib.functions) }));

// Four headline cards: big share, then what it counts.
function cards(model: Model, y: number): Drawn {
  const { game, sdk, data } = model.summary;
  const items: [string, string, string, string][] = [
    [`${percent(game.done_functions, game.functions, 1)}%`, SUMMARY.gameFunctions, SUMMARY.of(game.done_functions, game.functions), C.status.pure],
    [`${percent(game.done_bytes, game.bytes, 1)}%`, SUMMARY.gameBytes, SUMMARY.ofBytes(game.done_bytes, game.bytes), C.status.pure],
    [`${percent(sdk.done_functions, sdk.functions, 1)}%`, SUMMARY.sdk, SUMMARY.of(sdk.done_functions, sdk.functions), C.status.object],
    data
      ? [`${percent(data.typed, data.bytes, 2)}%`, SUMMARY.data, SUMMARY.ofBytes(data.typed, data.bytes), C.status.asm]
      : [SUMMARY.dataPending[0], SUMMARY.data, SUMMARY.dataPending[1], C.mute],
  ];
  const width = (WIDTH - 2 * MARGIN - 3 * GAP) / 4;
  let svg = "";
  items.forEach(([big, title, sub, color], index) => {
    const x = MARGIN + index * (width + GAP);
    svg += rect(x, y, width, 92, C.card) + frame(x + 0.5, y + 0.5, width - 1, 91, C.line);
    svg += text(x + 16, y + 9, title, 15, C.ink);
    svg += text(x + 16, y + 34, big, 44, color, { weight: "bold" });
    svg += text(x + 16 + textWidth(big, 44) * 1.18 + 14, y + 56, sub, 14, C.mute);
  });
  return { svg, bottom: y + 92 };
}

// The status legend, one row per status with its function count and code share.
function legend(model: Model, x: number, y: number): Drawn {
  const totals = model.summary.code;
  let svg = text(x, y, SUMMARY.statusHeading, 24, C.ink);
  STATUSES.forEach((key, index) => {
    const [functions, bytes] = totals.statuses[key];
    const top = y + 40 + index * 38;
    svg += rect(x, top + 2, 20, 20, C.status[key]);
    svg += text(x + 30, top - 2, STATUS[key].label, 16, C.ink);
    svg += text(x + 30, top + 17, SUMMARY.statusLine(functions, percent(bytes, totals.bytes, 1)), 12, C.mute);
  });
  return { svg, bottom: y + 40 + STATUSES.length * 38 };
}

// Data panel: per target, the share of data bytes typed in C.
function dataPanel(model: Model, x: number, y: number, width: number): Drawn {
  const total = model.data;
  const rows = model.targets.filter((t) => t.data && t.data.bytes).sort((a, b) => b.data!.bytes - a.data!.bytes);
  let svg = text(x, y, total ? DATA.heading(percent(total.typed, total.bytes), total.typed, total.bytes) : DATA.headingNone, 24, C.ink);
  const nameWidth = 180;
  const barWidth = width - nameWidth - 250 - 16;
  rows.forEach((t, index) => {
    const top = y + 40 + index * 22;
    const data = t.data!;
    svg += text(x, top, t.name, 13, C.ink);
    svg += bar(x + nameWidth, top + 1, barWidth, 14, [[data.typed, C.status.pure]], data.bytes);
    svg += text(x + width, top, `${percent(data.typed, data.bytes, 1)}% · ${number(data.typed)} / ${bytes(data.bytes)}`, 13, C.mute, { anchor: "end" });
  });
  return { svg, bottom: y + 40 + rows.length * 22 };
}

// Library panel: per PsyQ library, its functions by status and the versions it links from.
function libraryPanel(model: Model, x: number, y: number, width: number): Drawn {
  const libs = model.libraries.filter((lib) => lib.count > 2);
  let svg = text(x, y, POSTER.libraries, 24, C.ink);
  const peak = Math.max(...libs.map((lib) => weightOf(lib.functions)), 1);
  const nameWidth = 70;
  const barWidth = width - nameWidth - 96;
  libs.forEach((lib, index) => {
    const top = y + 40 + index * 36;
    const length = Math.max((weightOf(lib.functions) / peak) * barWidth, 2);
    svg += text(x, top, lib.name, 14, C.ink);
    svg += bar(x + nameWidth, top + 1, length, 14, STATUSES.map((key) => [lib.statuses[key].functions, C.status[key]]), lib.count);
    svg += text(x + width, top, `${number(lib.done)} / ${number(lib.count)}`, 13, C.mute, { anchor: "end" });
    const versions = Object.entries(lib.versions).map(([version, units]) => `${version} ×${units}`).join(" · ");
    svg += text(x + nameWidth, top + 18, versions ? SDK.versions(versions) : POSTER.libraryLinked, 11, C.mute);
  });
  const s = model.sdk.statuses;
  svg += text(x, y + 40 + libs.length * 36, POSTER.libraryKey(s.object.functions, s.assembly.functions, s.pure.functions + s.match_with_helpers.functions), 13, C.mute);
  return { svg, bottom: y + 40 + libs.length * 36 + 22 };
}

// Quality row: the counters of bin/status.
function qualityRow(model: Model, y: number): Drawn {
  let svg = text(MARGIN, y, QUALITY.heading, 24, C.ink);
  const width = (WIDTH - 2 * MARGIN - 4 * GAP) / 5;
  QUALITY.cards(model.quality).forEach(([name, value, sub], index) => {
    const x = MARGIN + index * (width + GAP);
    const top = y + 40;
    svg += rect(x, top, width, 70, C.card) + frame(x + 0.5, top + 0.5, width - 1, 69, C.line);
    svg += text(x + 14, top + 8, value, 30, C.ink, { weight: "bold" });
    svg += text(x + 14 + textWidth(value, 30) * 1.18 + 12, top + 10, name, 15, C.ink);
    svg += text(x + 14, top + 46, sub, 12, C.mute);
  });
  return { svg, bottom: y + 40 + 70 };
}

/** An ECharts SVG placed at (x, y) inside the picture. */
const nest = (svg: string, x: number, y: number): string => svg.replace(/^<svg /, `<svg x="${round(x)}" y="${round(y)}" `).replace(/^<\?xml[^>]*>/, "");

// The trend charts: the page's options, titled, in a grid of four columns.
function trends(model: Model, y: number): Drawn {
  const cols = 4;
  const width = (WIDTH - 2 * MARGIN - (cols - 1) * GAP) / cols;
  const height = 190;
  let svg = text(MARGIN, y, TREND.heading, 24, C.ink);
  TREND_CHARTS.forEach((chart, index) => {
    const x = MARGIN + (index % cols) * (width + GAP);
    const top = y + 40 + Math.floor(index / cols) * (height + 16);
    svg += rect(x, top, width, height, C.card);
    const option = trendOption(model.history, chart, C, { titled: true, fontFamily: FONT });
    svg += option ? nest(renderSvg(option, Math.round(width), height), x, top) : text(x + 12, top + 12, `${chart.title}: ${TREND.empty}`, 13, C.mute);
  });
  return { svg, bottom: y + 40 + Math.ceil(TREND_CHARTS.length / cols) * (height + 16) - 16 };
}

/** The status board as one SVG string. */
export function renderPoster(model: Model): string {
  let svg = text(MARGIN, MARGIN - 4, POSTER.title, 34, C.ink, { weight: "bold" });
  svg += text(MARGIN, MARGIN + 38, POSTER.subtitle(model.meta.commit.slice(0, 7), model.meta.date), 15, C.mute);
  const top = cards(model, MARGIN + 70);
  svg += top.svg;

  const gameTitle = MAP.gameTitle(percent(model.game.done, model.game.count), model.game.done, model.game.count);
  const sdkTitle = MAP.sdkTitle(percent(model.sdk.done, model.sdk.count), model.sdk.done, model.sdk.count);
  const y = top.bottom + GAP + 6;
  const left = panel(gameTitle, gameBlocks(model), MARGIN, y, GAME_WIDTH, 1);
  const right = MARGIN + GAME_WIDTH + GAP;
  const side = panel(sdkTitle, sdkBlocks(model), right, y, SIDE_WIDTH, SDK_SCALE);
  svg += left.svg + side.svg;
  const key = legend(model, right, side.bottom + GAP);
  svg += key.svg;

  const rowTop = Math.max(left.bottom, key.bottom) + 2 * GAP;
  const data = dataPanel(model, MARGIN, rowTop, GAME_WIDTH);
  const libs = libraryPanel(model, right, rowTop, SIDE_WIDTH);
  svg += data.svg + libs.svg;

  const quality = qualityRow(model, Math.max(data.bottom, libs.bottom) + 2 * GAP);
  svg += quality.svg;
  const trend = trends(model, quality.bottom + 2 * GAP);
  svg += trend.svg;

  const height = Math.ceil(trend.bottom + MARGIN);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}"` +
    ` font-family="${FONT}" role="img" aria-label="${escapeText(POSTER.title)}">` +
    `<rect width="${WIDTH}" height="${height}" fill="${C.bg}"/>${svg}</svg>`
  );
}

export type { Fn };
