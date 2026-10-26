// Selectors: each turns the model and the route into the data one kind of view draws
// (viewtypes.ts). They are pure, so they run in Node as well as in the page.

import { latest, trendOption } from "./charts/trend.ts";
import { gameImageTree, gamePartTree } from "./charts/treemap.ts";
import { browse, PAGE_STEP } from "./model/browse.ts";
import { ASSEMBLY_LIBRARY } from "./model/report.ts";
import { bytes, bytesOf, number, percent, plural } from "./model/format.ts";
import { TREND_CHARTS } from "./model/history.ts";
import { HOME, type Route } from "./model/route.ts";
import { codeCounts, STATUS, STATUS_TABLE, TIERS } from "./model/status.ts";
import { BROWSER, DATA, MAP, QUALITY, SDK, SITE, SUMMARY, TREND } from "./strings.ts";
import type { Code, Fn, Library, Target } from "./types.ts";
import type { Card, Ctx, GamePage, Link, MeterRow, Part, Views } from "./viewtypes.ts";

// Shared pieces ---------------------------------------------------------------------------

/** One bar of game code split by status, by function count. */
export const codeMeter = (code: Code, aria: string): MeterRow => ({
  aria,
  parts: codeCounts(code).map(([key, count]) => ({ width: percent(count, code.functions, 3), color: STATUS[key].color })),
});

// Overview and the sections below it -----------------------------------------------------

const pending = (id: string, title: string): Card => ({ id, big: SUMMARY.pending[0], title, sub: SUMMARY.pending[1], color: "var(--mute)" });
const share = (done: number, total: number, digits = 1) => `${percent(done, total, digits)}%`;

/** The headline: one number for each part, in the order they matter. */
export function overviewCards({ model }: Ctx): Views["cards"] {
  const { game, data, assets } = model.headline;
  const cards: Card[] = [
    { id: "game", big: share(game.exact, game.functions), title: SUMMARY.gameFunctions, sub: SUMMARY.of(game.exact, game.functions), color: STATUS.pure.color },
    data
      ? { id: "data", big: share(data.typed, data.bytes), title: SUMMARY.data, sub: SUMMARY.dataOf(data.typed, data.bytes), color: STATUS.pure.color }
      : pending("data", SUMMARY.data),
    assets
      ? { id: "assets", big: share(assets.decoded, assets.bytes), title: SUMMARY.assets, sub: SUMMARY.assetsOf(assets.decoded, assets.bytes), color: STATUS.object.color }
      : pending("assets", SUMMARY.assets),
  ];
  return { cards };
}

/** Game code beyond the headline: by size, each body once, and the report's fuzzy match. */
export function gameCards({ model }: Ctx): Views["cards"] {
  const { game } = model.headline;
  const unique = game.unique;
  const cards: Card[] = [
    { id: "game-bytes", big: share(game.exactBytes, game.bytes), title: SUMMARY.gameBytes, sub: SUMMARY.ofBytes(game.exactBytes, game.bytes), color: STATUS.pure.color },
    unique
      ? { id: "game-unique", big: share(unique.exact, unique.functions), title: SUMMARY.unique, sub: SUMMARY.of(unique.exact, unique.functions), color: STATUS.pure.color }
      : pending("game-unique", SUMMARY.unique),
    { id: "fuzzy", big: `${model.game.fuzzy.toFixed(1)}%`, title: SUMMARY.fuzzy, sub: SUMMARY.fuzzyNote },
  ];
  return { cards };
}

/** Game data beyond the headline: the bytes in C that are not typed yet. */
export function dataCards({ model }: Ctx): Views["cards"] {
  const data = model.headline.data;
  if (!data?.rawC) return { cards: [] };
  return { cards: [{ id: "data-raw", big: share(data.rawC, data.bytes), title: SUMMARY.dataRaw, sub: SUMMARY.dataRawOf(data.rawC, data.bytes), color: "var(--mute)" }] };
}

export const dataNote = ({ model }: Ctx): string => {
  const apart = model.headline.data?.apart;
  return apart ? SUMMARY.dataApart(apart.reserved, apart.copied, apart.sdk, apart.asset) : "";
};

/** Assets beyond the headline: extracted and converted back exactly. */
export function assetCards({ model }: Ctx): Views["cards"] {
  const { assets } = model.headline;
  if (!assets) return { cards: [] };
  return {
    cards: [
      { id: "assets-extracted", big: share(assets.extracted, assets.bytes), title: SUMMARY.assetsExtracted, sub: SUMMARY.assetsExtractedOf(assets.extracted, assets.bytes), color: "var(--mute)" },
      { id: "assets-round-trip", big: share(assets.roundTrip, assets.bytes, 2), title: SUMMARY.assetsRoundTrip, sub: SUMMARY.assetsRoundTripOf(assets.roundTrip, assets.bytes), color: "var(--mute)" },
    ],
  };
}

/** One bar per asset kind, sized by bytes: converted or extracted as stored. */
export function assetKinds({ model }: Ctx): Views["meters"] {
  const kinds = [...(model.headline.assets?.kinds ?? [])].sort((a, b) => b.bytes - a.bytes);
  const peak = Math.max(...kinds.map((kind) => kind.bytes), 1);
  const color = (handling: string) => (handling === "decoded" ? STATUS.object.color : handling === "raw" ? "var(--mute)" : "var(--track)");
  const handling = (key: string) => SUMMARY.assetHandling[key] ?? key;
  return {
    key: ["decoded", "raw"].map((key) => ({ label: handling(key), color: color(key) })),
    rows: kinds.map((kind) => ({
      label: kind.kind,
      aria: `${kind.kind}: ${handling(kind.handling)}, ${bytes(kind.bytes)}`,
      width: Math.max((kind.bytes / peak) * 100, 1),
      parts: [{ width: "100", color: color(kind.handling) }],
      count: bytes(kind.bytes),
      note: [plural(kind.entries, "file"), handling(kind.handling), kind.round_trip_bytes ? `${bytes(kind.round_trip_bytes)} convert back exactly` : ""].filter(Boolean).join(" · "),
    })),
  };
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
  const key = [
    { label: STATUS.pure.label, color: STATUS.pure.color, sub: MAP.key(code.exact, code.exactBytes) },
    { label: STATUS.nonmatching.label, color: STATUS.nonmatching.color, sub: MAP.key(code.draft, null) },
    { label: STATUS.open.label, color: STATUS.open.color, sub: MAP.key(code.functions - code.exact - code.draft, null) },
  ];
  const total = codeMeter(code, `${SUMMARY.gameHeading}: ${SUMMARY.of(code.exact, code.functions)}`);
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
  return { key, keyHelp: MAP.statusHelp, meter: total, groups };
}

/** The same statuses as filter chips for the function browser. */
export const statusChips = (): Views["legend"] => ({
  label: BROWSER.statusLabel,
  items: STATUS_TABLE.map(({ key, label, color }) => ({ key, label, color })),
});

const statusKey = (code: Code): GamePage["key"] =>
  codeCounts(code).map(([key, count]) => ({ label: STATUS[key].label, color: STATUS[key].color, sub: plural(count, "function") }));

/** A part of the game or an image: bin/status's counts, and the report's functions as a treemap and a list. */
export function gamePage({ model, route, tokens }: Ctx): GamePage | null {
  const home: Link = { label: MAP.heading, to: { view: HOME.view }, scroll: "map" };
  const empty = { found: false, percent: "", line: "", meter: null, key: [], note: "", facts: [], coverage: "", tree: null, functions: [], inPart: false };
  const page = (code: Code, functions: Fn[], line: string) => {
    const listed = functions.reduce((sum, fn) => sum + fn.bytes, 0);
    return {
      found: true,
      percent: `${percent(code.exact, code.functions, 1)}%`,
      line,
      meter: codeMeter(code, line),
      key: statusKey(code),
      functions,
      coverage: functions.length === code.functions && listed === code.bytes ? "" : MAP.coverage(functions.length, listed, code.functions, code.bytes),
    };
  };
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
      facts: [],
      tree: gamePartTree(group, tokens),
      inPart: true,
    };
  }
  if (route.view.kind === "image") {
    const id = route.view.id;
    const target = model.targetById.get(id);
    if (!target) return { ...empty, title: id, crumbs: [home, { label: id, to: {} }], message: MAP.imageMissing };
    const { code, data } = target;
    return {
      ...page(code, target.functions.filter((fn) => fn.kind === "game"), MAP.imageLine(code.exact, code.functions, code.bytes)),
      title: target.name,
      crumbs: [home, { label: target.groupLabel, to: { view: { kind: "part", key: target.group } } }, { label: target.name, to: {} }],
      note: "",
      facts: [
        { label: MAP.facts.size, value: [{ text: bytes(target.size) }] },
        { label: MAP.facts.data, value: [{ text: data ? `${percent(data.typed, data.bytes, 1)}% · ${bytesOf(data.typed, data.bytes)}` : "-" }] },
        { label: MAP.facts.source, value: [{ text: `src/${target.id}`, url: `${SITE.repoUrl}/tree/${model.meta.commit}/src/${target.id}`, code: true }] },
      ],
      tree: gameImageTree(target, tokens),
      inPart: false,
    };
  }
  return null;
}

// PsyQ SDK ---------------------------------------------------------------------------------

function libNote(lib: Library): string {
  // One version needs no count: the bar's count already says how many units link from it.
  const entries = Object.entries(lib.versions);
  const versions = entries.map(([version, units]) => (entries.length > 1 ? `${version} ×${units}` : version)).join(" · ");
  return [versions ? SDK.versions(versions) : "", lib.tiers.assembly ? SDK.assemblyOnly(lib.tiers.assembly) : ""].filter(Boolean).join(" · ");
}

/** One bar per library, split into PsyQ library objects and assembly only. */
export function sdkLibraries({ model }: Ctx): Views["meters"] {
  const peak = Math.max(...model.libraries.map((lib) => lib.count), 1);
  return {
    key: TIERS.map((tier) => ({ label: STATUS[tier].label, color: STATUS[tier].color })),
    rows: model.libraries.map((lib) => {
      const assembly = lib.name === ASSEMBLY_LIBRARY;
      const label = assembly ? SDK.assemblyLibrary : lib.name;
      const count = assembly ? number(lib.count) : SDK.done(lib.tiers.object, lib.count);
      return {
        name: { label, to: { lib: lib.name, part: "sdk" }, scroll: "browse" },
        aria: `${label}: ${count}`,
        width: Math.max((lib.count / peak) * 100, 1),
        parts: TIERS.filter((tier) => lib.tiers[tier]).map((tier) => ({ width: percent(lib.tiers[tier], lib.count, 3), color: STATUS[tier].color })),
        count,
        note: assembly ? "" : libNote(lib),
      };
    }),
  };
}

// Data and quality -------------------------------------------------------------------------

/** One bar per part of the game: the share of its data typed in C. */
export function dataMeters({ model }: Ctx): Views["meters"] {
  const rows = model.groups.flatMap((group) => (group.data ? [{ label: group.label, ...group.data }] : []));
  return {
    key: [
      { label: DATA.typed, color: STATUS.pure.color },
      { label: DATA.untyped, color: "var(--track)" },
    ],
    rows: rows.map((row) => {
      const share = `${percent(row.typed, row.bytes, 1)}%`;
      return {
        label: row.label,
        aria: `${row.label}: ${share} ${DATA.typed}, ${bytesOf(row.typed, row.bytes)}`,
        width: 100,
        parts: [{ width: percent(row.typed, row.bytes, 3), color: STATUS.pure.color }],
        count: `${share} · ${bytesOf(row.typed, row.bytes)}`,
      };
    }),
  };
}

/** One bar per part of the game with drafts, as long as its share of the most drafts. */
export function draftMeters({ model }: Ctx): Views["meters"] {
  const groups = model.groups.filter((group) => group.code.draft);
  const peak = Math.max(...groups.map((group) => group.code.draft), 1);
  return {
    rows: groups.map((group) => ({
      label: group.label,
      aria: `${group.label}: ${plural(group.code.draft, "draft")}`,
      width: Math.max((100 * group.code.draft) / peak, 1),
      parts: [{ width: "100", color: STATUS.nonmatching.color }],
      count: number(group.code.draft),
    })),
  };
}

export function verification({ model }: Ctx): Views["text"] {
  const { game, data, assets } = model.headline;
  return {
    paragraphs: [
      { label: QUALITY.gameScope, text: QUALITY.gameScopeText(game.exact, game.functions, game.exactBytes, game.bytes) },
      { label: QUALITY.dataScope, text: QUALITY.dataScopeText(data?.typed ?? null, data?.bytes ?? null, data?.rawC ?? null) },
      { label: QUALITY.assetScope, text: QUALITY.assetScopeText(assets?.decoded ?? null, assets?.bytes ?? null) },
    ],
  };
}

const dataCell = (target: Target): Part[] =>
  target.data ? [{ text: `${percent(target.data.typed, target.data.bytes, 1)}% · ${bytesOf(target.data.typed, target.data.bytes)}` }] : [{ text: "-", mute: true }];

const Q = QUALITY.columns;
export const auditTable = ({ model }: Ctx): Views["table"] => ({
  disclosure: QUALITY.table,
  columns: [{ label: Q.image }, { label: Q.functions, align: "r" }, { label: Q.rebuilt, align: "r" }, { label: Q.drafts, align: "r" }, { label: Q.size, align: "r" }, { label: Q.fuzzy, align: "r" }, { label: Q.data }],
  rows: model.groups.flatMap((group) => group.targets).map((t) => ({
    id: t.id,
    cells: [
      [{ text: t.name, to: gameMapRoute({ kind: "image", id: t.id }) }, { text: t.id, code: true, mute: true, br: true }],
      [{ text: number(t.code.functions) }],
      [{ text: number(t.code.exact) }],
      [{ text: number(t.code.draft) }],
      [{ text: bytes(t.code.bytes) }],
      [{ text: `${t.game.fuzzy.toFixed(1)}%` }],
      dataCell(t),
    ],
  })),
});

// Trend ------------------------------------------------------------------------------------

export function trend({ model, tokens }: Ctx): Views["trend"] {
  return {
    empty: TREND.empty,
    charts: TREND_CHARTS.map((chart) => ({ id: chart.id, title: chart.title, value: latest(model.history, chart), option: trendOption(model.history, chart, tokens) })),
  };
}

// Function browser -------------------------------------------------------------------------

export function browserFilters({ model }: Ctx): Views["filters"] {
  return {
    search: { label: BROWSER.searchLabel, placeholder: BROWSER.searchPlaceholder },
    selects: [
      { label: BROWSER.scopeLabel, field: "part", any: false, also: { lib: null }, options: (["all", "game", "sdk", "hand"] as const).map((value) => ({ value, label: BROWSER.scopes[value] })) },
      {
        label: BROWSER.targetLabel,
        field: "target",
        any: true,
        options: [{ value: "", label: BROWSER.allTargets }, ...model.groups.flatMap((group) => group.targets.map((t) => ({ value: t.id, label: t.name, group: group.label })))],
      },
      { label: BROWSER.libraryLabel, field: "lib", any: true, options: [{ value: "", label: BROWSER.allLibraries }, ...model.libraries.map((lib) => ({ value: lib.name, label: lib.name === ASSEMBLY_LIBRARY ? SDK.assemblyLibrary : lib.name }))] },
      { label: BROWSER.sortLabel, field: "sort", any: false, options: (Object.keys(BROWSER.sorts) as (keyof typeof BROWSER.sorts)[]).map((value) => ({ value, label: BROWSER.sorts[value] })) },
    ],
  };
}

/** Says that the list holds the report's functions when bin/status counts more. */
export const browserScope = ({ model }: Ctx): string => (model.game.count === model.code.functions ? "" : BROWSER.scope(model.game.count, model.code.functions));

export function browserTable({ model, route, limit }: Ctx): Views["table"] {
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
      id: fn.id,
      cells: [
        [{ text: fn.name, to: { fn: fn.id } }],
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
