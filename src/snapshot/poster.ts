// progress.svg: the whole status board as one picture. render/snapshot.ts turns it into progress.png.
//
// The cards, the parts of the game, the SDK tiles and the bars are drawn here as SVG strings. The
// trend charts are the ECharts options the page uses, rendered on the server and nested into the
// picture.

import { renderSvg } from "../charts/ssr.ts";
import { trendOption } from "../charts/trend.ts";
import { TREND_CHARTS } from "../model/history.ts";
import { bytesOf, escapeText, percent, round } from "../model/format.ts";
import { codeCounts, STATUS, STATUSES } from "../model/status.ts";
import { textWidth } from "../model/text.ts";
import { MAP, POSTER, SDK, SUMMARY, TREND } from "../strings.ts";
import type { Code, Fn, Model } from "../types.ts";
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

const sdkBlocks = (model: Model): Block[] => model.libraries.map((lib) => ({ name: lib.name, rows: sorted(lib.functions) }));

// The headline, in the order the numbers matter: game code, each body once, game data, assets.
function cards(model: Model, y: number): Drawn {
  const { game, data, assets } = model.headline;
  const unique = game.unique;
  const items: [string, string, string, string][] = [
    [`${percent(game.exact, game.functions, 1)}%`, SUMMARY.gameFunctions, SUMMARY.of(game.exact, game.functions), C.status.pure],
    unique
      ? [`${percent(unique.exact, unique.functions, 1)}%`, SUMMARY.unique, SUMMARY.of(unique.exact, unique.functions), C.status.pure]
      : [`${percent(game.exactBytes, game.bytes, 1)}%`, SUMMARY.gameBytes, SUMMARY.ofBytes(game.exactBytes, game.bytes), C.status.pure],
    data
      ? [`${percent(data.typed, data.bytes, 1)}%`, SUMMARY.data, SUMMARY.dataOf(data.typed, data.bytes), C.status.pure]
      : [SUMMARY.pending[0], SUMMARY.data, SUMMARY.pending[1], C.mute],
    assets
      ? [`${percent(assets.decoded, assets.bytes, 1)}%`, SUMMARY.assets, SUMMARY.assetsOf(assets.decoded, assets.bytes), C.status.object]
      : [SUMMARY.pending[0], SUMMARY.assets, SUMMARY.pending[1], C.mute],
  ];
  const width = (WIDTH - 2 * MARGIN - 3 * GAP) / 4;
  const height = 100;
  let svg = "";
  items.forEach(([big, title, sub, color], index) => {
    const x = MARGIN + index * (width + GAP);
    svg += rect(x, y, width, height, C.card) + frame(x + 0.5, y + 0.5, width - 1, height - 1, C.line);
    svg += text(x + 16, y + 9, title, 15, C.ink);
    svg += text(x + 16, y + 34, big, 44, color, { weight: "bold" });
    svg += text(x + 16, y + 76, sub, 14, C.mute);
  });
  return { svg, bottom: y + height };
}

// The game status key, one row per status with its function count.
function legend(model: Model, x: number, y: number): Drawn {
  const { code } = model;
  const rows: [keyof typeof C.status, string][] = [
    ["pure", MAP.key(code.exact, code.exactBytes)],
    ["nonmatching", MAP.key(code.draft, null)],
    ["open", MAP.key(code.functions - code.exact - code.draft, null)],
  ];
  let svg = text(x, y, POSTER.statusHeading, 24, C.ink);
  rows.forEach(([key, sub], index) => {
    const top = y + 40 + index * 38;
    svg += rect(x, top + 2, 20, 20, C.status[key]);
    svg += text(x + 30, top - 2, STATUS[key].label, 16, C.ink);
    svg += text(x + 30, top + 17, sub, 12, C.mute);
  });
  return { svg, bottom: y + 40 + rows.length * 38 };
}

/** One bar split by status, by function count. */
const codeBar = (x: number, y: number, width: number, height: number, code: Code): string =>
  bar(x, y, width, height, codeCounts(code).map(([key, count]) => [count, C.status[key]]), code.functions);

// Image rows: name, a bar as long as the image's share of the group's biggest, and its count.
const ROW = 20;
const ROW_COLUMNS = 3;
// Image tiles: one small square per image, split by status; the page names each one.
const TILE = 18;
const TILE_GAP = 3;

// Game code by part of the game: per group a heading, its bar, then its images.
function domainPanel(model: Model, x: number, y: number, width: number): Drawn {
  let svg = text(x, y, MAP.heading, 24, C.ink);
  let top = y + 44;
  for (const group of model.groups.filter((g) => g.code.functions)) {
    const images = group.targets.filter((target) => target.code.functions);
    const share = `${percent(group.code.exact, group.code.functions, 1)}%`;
    svg += text(x, top, group.label, 17, C.ink, { weight: "bold" });
    const after = x + textWidth(group.label, 17) * 1.06 + 12;
    svg += text(after, top, share, 17, C.status.pure, { weight: "bold" });
    svg += text(width + x, top + 3, MAP.group(group.code.exact, group.code.functions, group.code.bytes, images.length), 13, C.mute, { anchor: "end" });
    svg += codeBar(x, top + 26, width, 10, group.code);
    top += 46;
    if (group.tiles) {
      const cols = Math.floor((width + TILE_GAP) / (TILE + TILE_GAP));
      images.forEach((target, index) => {
        const tx = x + (index % cols) * (TILE + TILE_GAP);
        const ty = top + Math.floor(index / cols) * (TILE + TILE_GAP);
        // A tile fills from the bottom: rebuilt, then draft, over the not-started track.
        let fill = ty + TILE;
        svg += rect(tx, ty, TILE, TILE, C.status.open, `<title>${escapeText(target.name)}</title>`);
        for (const [key, count] of codeCounts(target.code).filter(([key]) => key !== "open")) {
          const h = (count / target.code.functions) * TILE;
          fill -= h;
          svg += rect(tx, fill, TILE, h, C.status[key]);
        }
      });
      top += Math.ceil(images.length / cols) * (TILE + TILE_GAP) + 16;
    } else {
      const columnWidth = (width - (ROW_COLUMNS - 1) * GAP) / ROW_COLUMNS;
      // The column fits the longest name: a file name is never cut.
      const nameWidth = Math.max(...images.map((target) => textWidth(target.name, 12))) + 10;
      const countWidth = 70;
      const barRoom = columnWidth - nameWidth - countWidth - 12;
      const peak = Math.max(...images.map((target) => target.code.bytes), 1);
      const lines = Math.ceil(images.length / ROW_COLUMNS);
      images.forEach((target, index) => {
        const cx = x + Math.floor(index / lines) * (columnWidth + GAP);
        const cy = top + (index % lines) * ROW;
        svg += text(cx, cy, target.name, 12, C.ink);
        svg += codeBar(cx + nameWidth, cy + 2, Math.max((target.code.bytes / peak) * barRoom, 2), 11, target.code);
        svg += text(cx + columnWidth, cy, MAP.image(target.code.exact, target.code.functions), 12, C.mute, { anchor: "end" });
      });
      top += lines * ROW + 16;
    }
  }
  return { svg, bottom: top - 16 };
}

// Data panel: per part of the game, the share of data bytes typed and named in C.
function dataPanel(model: Model, x: number, y: number, width: number): Drawn {
  const total = model.data;
  const rows = model.groups.flatMap((group) => (group.data ? [{ name: group.label, ...group.data }] : []));
  let svg = text(x, y, total ? POSTER.dataHeading(percent(total.typed, total.bytes, 1), total.typed, total.bytes) : SUMMARY.dataHeading, 24, C.ink);
  const nameWidth = 180;
  const barWidth = width - nameWidth - 250 - 16;
  rows.forEach((row, index) => {
    const top = y + 40 + index * 22;
    svg += text(x, top, row.name, 13, C.ink);
    svg += bar(x + nameWidth, top + 1, barWidth, 14, [[row.typed, C.status.pure]], row.bytes);
    svg += text(x + width, top, `${percent(row.typed, row.bytes, 1)}% · ${bytesOf(row.typed, row.bytes)}`, 13, C.mute, { anchor: "end" });
  });
  return { svg, bottom: y + 40 + rows.length * 22 };
}

// Library panel: per PsyQ library, its units by kind and the versions it links from.
function libraryPanel(model: Model, x: number, y: number, width: number): Drawn {
  const libs = model.libraries.filter((lib) => lib.count > 2);
  let svg = text(x, y, POSTER.libraries, 24, C.ink);
  const peak = Math.max(...libs.map((lib) => weightOf(lib.functions)), 1);
  const nameWidth = 70;
  const barWidth = width - nameWidth - 96;
  libs.forEach((lib, index) => {
    const top = y + 40 + index * 36;
    const length = Math.max((weightOf(lib.functions) / peak) * barWidth, 2);
    const assembly = lib.name === "assembly";
    svg += text(x, top, assembly ? SDK.assemblyLibrary : lib.name, 14, C.ink);
    svg += bar(x + nameWidth, top + 1, length, 14, STATUSES.map((key) => [lib.statuses[key].functions, C.status[key]]), lib.count);
    svg += text(x + width, top, assembly ? SDK.assemblyOnly(lib.count) : SDK.done(lib.tiers.object, lib.count), 13, C.mute, { anchor: "end" });
    const versions = Object.entries(lib.versions).map(([version, units]) => `${version} ×${units}`).join(" · ");
    svg += text(x + nameWidth, top + 18, assembly ? "" : versions ? SDK.versions(versions) : POSTER.libraryLinked, 11, C.mute);
  });
  const s = model.sdk.statuses;
  svg += text(x, y + 40 + libs.length * 36, POSTER.libraryKey(s.object.functions, s.assembly.functions), 13, C.mute);
  return { svg, bottom: y + 40 + libs.length * 36 + 22 };
}

// Quality row: the counters the report proves.
function qualityRow(model: Model, y: number): Drawn {
  let svg = text(MARGIN, y, POSTER.qualityHeading, 24, C.ink);
  const width = (WIDTH - 2 * MARGIN - 4 * GAP) / 5;
  POSTER.qualityCards(model.quality).forEach(([name, value, sub], index) => {
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

  const sdkTitle = POSTER.sdkTitle(percent(model.sdk.done, model.sdk.count), model.sdk.done, model.sdk.count);
  const y = top.bottom + GAP + 6;
  const left = domainPanel(model, MARGIN, y, GAME_WIDTH);
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
