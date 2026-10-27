// Selectors: each turns the model and the route into the data one kind of view draws
// (viewtypes.ts). They are pure, so they run in Node as well as in the page.

import { gameImageTree, gamePartTree } from "./charts/treemap.ts";
import { browse, PAGE_STEP } from "./model/browse.ts";
import { bytes, percent, plural } from "./model/format.ts";
import { HOME, type Route } from "./model/route.ts";
import { codeCounts, STATUS } from "./model/status.ts";
import { BROWSER, MAP, SDK, SUMMARY } from "./strings.ts";
import type { Code, Fn } from "./types.ts";
import type { Ctx, GamePage, Link, MeterRow, Views } from "./viewtypes.ts";

// Shared pieces ---------------------------------------------------------------------------

/** One bar of game code split by status, by function count. */
export const codeMeter = (code: Code, aria: string): MeterRow => ({
  aria,
  parts: codeCounts(code).map(([key, count]) => ({ width: percent(count, code.functions, 3), color: STATUS[key].color })),
});

// Overview and the sections below it -----------------------------------------------------

const share = (done: number, total: number, digits = 1) => `${percent(done, total, digits)}%`;

/** The headline: game code rebuilt in C, by functions and by size. */
export function overviewCards({ model }: Ctx): Views["cards"] {
  const { game } = model.headline;
  return {
    cards: [
      { id: "game", big: share(game.exact, game.functions), title: SUMMARY.gameFunctions, sub: SUMMARY.of(game.exact, game.functions), color: STATUS.pure.color },
      { id: "game-bytes", big: share(game.exactBytes, game.bytes), title: SUMMARY.gameBytes, sub: SUMMARY.ofBytes(game.exactBytes, game.bytes), color: STATUS.pure.color },
    ],
  };
}

/** One bar of all game code, with the rebuilt, draft and open counts as its key. */
export function overviewMeter({ model }: Ctx): Views["meters"] {
  const { code } = model;
  const count = (status: "pure" | "nonmatching" | "open", functions: number, size: number | null) => ({ label: STATUS[status].label, color: STATUS[status].color, sub: MAP.key(functions, size) });
  const key = [count("pure", code.exact, code.exactBytes), count("nonmatching", code.draft, null), count("open", code.functions - code.exact - code.draft, null)];
  return { key, rows: [codeMeter(code, `${SUMMARY.gameHeading}: ${SUMMARY.of(code.exact, code.functions)}`)] };
}

/** The SDK and the hand-written assembly, shown apart from the game totals. */
export const apart = ({ model }: Ctx): Views["text"] => ({
  paragraphs: [
    { text: SDK.sdkText(model.sdk.done, model.sdk.count, model.sdk.statuses.assembly.functions) },
    { label: SDK.handLabel, text: SDK.handText(model.hand.done, model.hand.count) },
  ],
});

// Map --------------------------------------------------------------------------------------
const gameMapRoute = (view: Extract<Route["view"], { kind: "image" | "part" }>): Partial<Route> => ({
  view,
  fn: null,
  q: "",
  st: [],
  part: "all",
  lib: null,
  target: null,
  sort: "address",
  dir: "asc",
});

/** Game code by part of the game: each group's heading and bar, then its images, biggest first. */
export function domains({ model }: Ctx): Views["domains"] {
  const { code } = model;
  const groups = model.groups
    .filter((group) => group.code.functions)
    .map((group) => {
      const images = group.targets.filter((target) => target.code.functions);
      const peak = Math.max(...images.map((target) => target.code.bytes), 1);
      const line = MAP.group(group.code.exact, group.code.functions, group.code.bytes, images.length);
      return {
        key: group.key,
        title: { label: group.label, to: gameMapRoute({ kind: "part", key: group.key }) },
        note: group.note,
        percent: `${percent(group.code.exact, group.code.functions, 1)}%`,
        line,
        meter: codeMeter(group.code, `${group.label}: ${line}`),
        tiles: group.tiles,
        images: images.map((target) => ({
          id: target.id,
          label: target.name,
          line: MAP.image(target.code.exact, target.code.functions),
          size: bytes(target.code.bytes),
          aria: MAP.imageAria(target.name, target.code.exact, target.code.draft, target.code.functions, target.code.bytes),
          width: Math.max((100 * target.code.bytes) / peak, 2),
          parts: codeMeter(target.code, target.name).parts,
          to: gameMapRoute({ kind: "image", id: target.id }),
        })),
      };
    });
  return { groups };
}

const statusKey = (code: Code): GamePage["key"] =>
  codeCounts(code).map(([key, count]) => ({ label: STATUS[key].label, color: STATUS[key].color, sub: plural(count, "function") }));

/** A part of the game or an image: the report's counts, then its functions as a treemap and a list. */
export function gamePage({ model, route, tokens }: Ctx): GamePage | null {
  const home: Link = { label: MAP.heading, to: { view: HOME.view }, scroll: "map" };
  const empty = { found: false, percent: "", line: "", meter: null, key: [], note: "", tree: null, functions: [], inPart: false };
  const page = (code: Code, functions: Fn[], line: string) => ({
    found: true,
    percent: `${percent(code.exact, code.functions, 1)}%`,
    line,
    meter: codeMeter(code, line),
    key: statusKey(code),
    functions,
  });
  if (route.view.kind === "part") {
    const key = route.view.key;
    const group = model.groups.find((item) => item.key === key);
    if (!group) return { ...empty, title: key, crumbs: [home, { label: key, to: {} }], message: MAP.partMissing };
    const images = group.targets.filter((target) => target.code.functions);
    return {
      ...page(group.code, group.targets.flatMap((target) => target.functions.filter((fn) => fn.kind === "game")), MAP.group(group.code.exact, group.code.functions, group.code.bytes, images.length)),
      title: group.label,
      crumbs: [home, { label: group.label, to: {} }],
      note: group.note,
      tree: gamePartTree(group, tokens),
      inPart: true,
    };
  }
  if (route.view.kind === "image") {
    const id = route.view.id;
    const target = model.targetById.get(id);
    if (!target) return { ...empty, title: id, crumbs: [home, { label: id, to: {} }], message: MAP.imageMissing };
    return {
      ...page(target.code, target.functions.filter((fn) => fn.kind === "game"), MAP.imageLine(target.code.exact, target.code.functions, target.code.bytes)),
      title: target.name,
      crumbs: [home, { label: target.groupLabel, to: { view: { kind: "part", key: target.group } } }, { label: target.name, to: {} }],
      note: "",
      tree: gameImageTree(target, tokens),
      inPart: false,
    };
  }
  return null;
}

// Search -------------------------------------------------------------------------

export const search = (): Views["filters"] => ({ search: { label: BROWSER.searchLabel, placeholder: BROWSER.searchPlaceholder } });

export function searchTable({ model, route, limit }: Ctx): Views["table"] {
  const found = browse(model, route);
  const canReset = !!(route.q || route.st.length || route.part !== HOME.part || route.lib || route.target || route.sort !== HOME.sort || route.dir !== HOME.dir);
  return {
    columns: [
      { label: BROWSER.columns.function, sort: "name" },
      { label: BROWSER.columns.status, sort: "status" },
      { label: BROWSER.columns.size, align: "r", sort: "size" },
      { label: BROWSER.columns.target },
      { label: BROWSER.columns.address, sort: "address" },
    ],
    rows: found.slice(0, limit).map((fn) => ({
      id: fn.unit,
      cells: [
        [{ text: fn.name, to: { fn: fn.unit } }],
        [{ text: "", status: fn.status }],
        [{ text: bytes(fn.bytes) }],
        [{ text: model.targetById.get(fn.target)?.name ?? "", to: gameMapRoute({ kind: "image", id: fn.target }) }],
        [{ text: fn.addr || "-", code: true }],
      ],
    })),
    message: !found.length ? BROWSER.none : found.length > limit ? BROWSER.limited(limit, found.length) : BROWSER.shown(found.length),
    actions: { canReset },
    more: found.length > limit ? BROWSER.more(PAGE_STEP) : undefined,
  };
}
