// Selectors: each turns the model and the route into the data one kind of view draws
// (viewtypes.ts). They are pure, so they run in Node as well as in the page.

import { gameImageTree, overviewTree } from "./charts/treemap.ts";
import { browse, PAGE_STEP } from "./model/browse.ts";
import { bytes, percent, plural } from "./model/format.ts";
import { HOME, type Route } from "./model/route.ts";
import { codeCounts, codeSizes, STATUS } from "./model/status.ts";
import { BROWSER, MAP, SDK, SUMMARY } from "./strings.ts";
import type { Code, Fn, Target } from "./types.ts";
import type { Ctx, GamePage, Link, MeterRow, Views } from "./viewtypes.ts";

// Shared pieces ---------------------------------------------------------------------------

/** One bar of game code split by status, by function count or by code bytes. */
export const codeMeter = (
  code: Code,
  aria: string,
  by: "functions" | "bytes" = "functions",
): MeterRow => {
  const split = by === "bytes" ? codeSizes(code) : codeCounts(code);
  const total = by === "bytes" ? code.bytes : code.functions;
  return {
    aria,
    parts: split.map(([key, amount]) => ({
      width: percent(amount, total, 3),
      color: STATUS[key].color,
    })),
  };
};

/** The key of a game code bar: each status with its function count. */
export const statusKey = (code: Code): GamePage["key"] =>
  codeCounts(code).map(([key, count]) => ({
    label: STATUS[key].label,
    color: STATUS[key].color,
    sub: plural(count, "function"),
  }));

// Overview and the sections below it -----------------------------------------------------

const share = (done: number, total: number, digits = 1) => `${percent(done, total, digits)}%`;

/** The headline: game code rebuilt in C, by functions and by size. */
export function overviewCards({ model }: Ctx): Views["cards"] {
  const game = model.code;
  return {
    cards: [
      {
        id: "game",
        big: share(game.exact, game.functions),
        title: SUMMARY.gameFunctions,
        sub: SUMMARY.of(game.exact, game.functions),
        color: STATUS.pure.color,
      },
      {
        id: "game-bytes",
        big: share(game.exactBytes, game.bytes),
        title: SUMMARY.gameBytes,
        sub: SUMMARY.ofBytes(game.exactBytes, game.bytes),
        color: STATUS.pure.color,
      },
    ],
  };
}

/** Two bars of all game code, by functions and by code bytes, with the status key. */
export function overviewMeter({ model }: Ctx): Views["meters"] {
  const { code } = model;
  const heading = SUMMARY.gameHeading;
  return {
    key: statusKey(code),
    rows: [
      {
        ...codeMeter(
          code,
          `${heading}, ${SUMMARY.byFunctions}: ${SUMMARY.of(code.exact, code.functions)}`,
        ),
        label: SUMMARY.byFunctions,
      },
      {
        ...codeMeter(
          code,
          `${heading}, ${SUMMARY.byBytes}: ${SUMMARY.ofBytes(code.exactBytes, code.bytes)}`,
          "bytes",
        ),
        label: SUMMARY.byBytes,
      },
    ],
  };
}

/** The PsyQ version the linked SDK units come from. */
const sdkVersion = (functions: Fn[]): string =>
  functions.find((fn) => fn.kind === "sdk" && fn.version)?.version ?? "";

/** The SDK units of some functions, linked from objects or split assembly, as unit and byte counts. */
const sdkSplit = (functions: Fn[]) => {
  const linked = { units: 0, bytes: 0 };
  const split = { units: 0, bytes: 0 };
  for (const fn of functions) {
    if (fn.kind !== "sdk") continue;
    const side = fn.tier === "object" ? linked : split;
    side.units += 1;
    side.bytes += fn.bytes;
  }
  return { linked, split };
};

/** The SDK and the hand-written assembly, shown apart from the game totals. */
export const apart = ({ model }: Ctx): Views["text"] => ({
  paragraphs: [
    {
      text: SDK.sdkText(
        sdkSplit(model.functions).linked,
        sdkSplit(model.functions).split,
        sdkVersion(model.functions),
      ),
    },
    { text: SDK.totalText(model.game.bytes, model.sdk.bytes, model.hand.bytes) },
    { label: SDK.handLabel, text: SDK.handText(model.hand.done, model.hand.count) },
  ],
});

// Map --------------------------------------------------------------------------------------
const gameMapRoute = (
  view: Extract<Route["view"], { kind: "image" | "part" }>,
): Partial<Route> => ({
  view,
  fn: null,
  q: "",
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
      const line = MAP.group(
        group.code.exact,
        group.code.functions,
        group.code.bytes,
        images.length,
      );
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
          aria: MAP.imageAria(
            target.name,
            target.code.exact,
            target.code.draft,
            target.code.functions,
            target.code.bytes,
          ),
          width: Math.max((100 * target.code.bytes) / peak, 2),
          parts: codeMeter(target.code, target.name).parts,
          to: gameMapRoute({ kind: "image", id: target.id }),
        })),
      };
    });
  return { groups };
}

/** A part of the game or an image: the report's counts, then its functions as a treemap and a list. */
export function gamePage({ model, route, tokens }: Ctx): GamePage | null {
  const home: Link = { label: MAP.heading, to: { view: HOME.view }, scroll: "map" };
  const empty = {
    found: false,
    percent: "",
    line: "",
    meter: null,
    key: [],
    note: "",
    tree: null,
    functions: [],
    inPart: false,
  };
  const page = (code: Code, functions: Fn[], line: string, targets: Target[]) => {
    const sdk = targets.flatMap((target) => target.functions.filter((fn) => fn.kind === "sdk"));
    return {
      found: true,
      percent: `${percent(code.exactBytes, code.bytes, 1)}%`,
      line,
      meter: codeMeter(code, line, "bytes"),
      key: [
        ...statusKey(code),
        ...(sdk.length
          ? [{
            label: SDK.legend(sdkVersion(sdk)),
            color: tokens.sdk,
            sub: SDK.legendSub(sdk.length, sdk.reduce((sum, fn) => sum + fn.bytes, 0)),
          }]
          : []),
      ],
      functions,
    };
  };
  if (route.view.kind === "part") {
    const key = route.view.key;
    const group = model.groups.find((item) => item.key === key);
    if (!group) {
      return {
        ...empty,
        title: key,
        crumbs: [home, { label: key, to: {} }],
        message: MAP.partMissing,
      };
    }
    const images = group.targets.filter((target) => target.code.functions);
    return {
      ...page(
        group.code,
        group.targets.flatMap((target) => target.functions.filter((fn) => fn.kind === "game")),
        MAP.group(group.code.exact, group.code.functions, group.code.bytes, images.length),
        group.targets,
      ),
      title: group.label,
      crumbs: [home, { label: group.label, to: {} }],
      note: group.note,
      tree: overviewTree(model, tokens, "image", 992, 540, key),
      inPart: true,
    };
  }
  if (route.view.kind === "image") {
    const id = route.view.id;
    const target = model.targetById.get(id);
    if (!target) {
      return {
        ...empty,
        title: id,
        crumbs: [home, { label: id, to: {} }],
        message: MAP.imageMissing,
      };
    }
    return {
      ...page(
        target.code,
        target.functions.filter((fn) => fn.kind === "game"),
        MAP.imageLine(target.code.exact, target.code.functions, target.code.bytes),
        [target],
      ),
      title: target.name,
      crumbs: [home, {
        label: target.groupLabel,
        to: { view: { kind: "part", key: target.group } },
      }, { label: target.name, to: {} }],
      note: "",
      tree: gameImageTree(target, tokens, true),
      inPart: false,
    };
  }
  return null;
}

// Search -------------------------------------------------------------------------

export const search = (): Views["filters"] => ({
  search: {
    label: BROWSER.searchLabel,
    hint: BROWSER.hint,
    placeholder: BROWSER.searchPlaceholder,
  },
});

export function searchTable({ model, route, limit }: Ctx): Views["table"] {
  const found = route.q ? browse(model, route) : [];
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
        [{
          text: model.targetById.get(fn.target)?.name ?? "",
          to: gameMapRoute({ kind: "image", id: fn.target }),
        }],
        [{ text: fn.addr || "-", code: true }],
      ],
    })),
    message: !route.q
      ? ""
      : !found.length
      ? BROWSER.none
      : found.length > limit
      ? BROWSER.limited(limit, found.length)
      : BROWSER.shown(found.length),
    more: found.length > limit ? BROWSER.more(PAGE_STEP) : undefined,
  };
}
