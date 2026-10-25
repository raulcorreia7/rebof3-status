// Selectors: each turns the model and the route into the data one kind of view draws
// (viewtypes.ts). They are pure, so they run in Node as well as in the page.

import { BAR_HEIGHT, barOption } from "./charts/bars.ts";
import { latest, trendOption } from "./charts/trend.ts";
import { treemapTree } from "./charts/treemap.ts";
import { browse, PAGE_STEP } from "./model/browse.ts";
import { ASSEMBLY_LIBRARY } from "./model/report.ts";
import { bytes, bytesOf, number, percent } from "./model/format.ts";
import { TREND_CHARTS } from "./model/history.ts";
import { HOME } from "./model/route.ts";
import { codeCounts, STATUS, STATUS_TABLE, TIERS } from "./model/status.ts";
import { BROWSER, DATA, MAP, QUALITY, SDK, SUMMARY, TIER_LABEL, TREND } from "./strings.ts";
import type { Code, Headline, Library, Status, Target } from "./types.ts";
import type { Card, Ctx, Link, MeterRow, Part, Views } from "./viewtypes.ts";

// Shared pieces ---------------------------------------------------------------------------

/** One bar of game code split by status, by function count. */
export const codeMeter = (code: Code, aria: string): MeterRow => ({
  aria,
  parts: codeCounts(code).map(([key, count]) => ({ width: percent(count, code.functions, 3), color: STATUS[key].color })),
});

// Overview ----------------------------------------------------------------------

const pending = (id: string, title: string, [big, sub]: string[]): Card => ({ id, big, title, sub, color: "var(--mute)" });

function dataCard({ data }: Headline): Card {
  return data
    ? { id: "data", big: `${percent(data.typed, data.bytes, 1)}%`, title: SUMMARY.data, sub: SUMMARY.ofBytes(data.typed, data.bytes), color: "var(--st-typed)" }
    : pending("data", SUMMARY.data, SUMMARY.dataPending);
}

function assetCard({ assets }: Headline): Card {
  return assets
    ? { id: "assets", big: `${percent(assets.decoded, assets.bytes, 1)}%`, title: SUMMARY.assetsDecoded, sub: SUMMARY.ofMegabytes(assets.decoded, assets.bytes), color: "var(--tier-object)" }
    : pending("assets", SUMMARY.assetsDecoded, SUMMARY.assetsPending);
}

/** The headline: one number for each part, in the order they matter. */
export function overviewCards({ model }: Ctx): Views["cards"] {
  const { game } = model.headline;
  const cards: Card[] = [
    { id: "game", big: `${percent(game.exact, game.functions, 1)}%`, title: SUMMARY.gameFunctions, sub: SUMMARY.of(game.exact, game.functions), color: STATUS.pure.color },
    dataCard(model.headline),
    assetCard(model.headline),
  ];
  return { cards };
}

/** Game code: every copy, each body once, and the report's fuzzy match. */
export function gameCards({ model }: Ctx): Views["cards"] {
  const { game } = model.headline;
  const unique = game.unique;
  const cards: Card[] = [
    { id: "game", big: `${percent(game.exact, game.functions, 1)}%`, title: SUMMARY.gameFunctions, sub: SUMMARY.of(game.exact, game.functions), color: STATUS.pure.color },
    { id: "game-bytes", big: `${percent(game.exactBytes, game.bytes, 1)}%`, title: SUMMARY.gameBytes, sub: SUMMARY.ofBytes(game.exactBytes, game.bytes), color: STATUS.pure.color },
    unique
      ? { id: "game-unique", big: `${percent(unique.exact, unique.functions, 1)}%`, title: SUMMARY.unique, sub: SUMMARY.uniqueNote(unique.exact, unique.functions), color: STATUS.pure.color }
      : pending("game-unique", SUMMARY.unique, SUMMARY.dataPending),
    { id: "fuzzy", big: `${model.game.fuzzy.toFixed(1)}%`, title: SUMMARY.fuzzy, sub: SUMMARY.fuzzyNote, color: STATUS.nonmatching.color },
  ];
  return { cards };
}


export function dataCards({ model }: Ctx): Views["cards"] {
  const raw = model.headline.data?.rawC;
  const cards = [dataCard(model.headline)];
  if (raw && model.headline.data) {
    cards.push({ id: "data-raw", big: `${percent(raw, model.headline.data.bytes, 1)}%`, title: SUMMARY.dataRaw, sub: `${bytes(raw)}, ${SUMMARY.dataRawNote}`, color: "var(--mute)" });
  }
  return { cards };
}

export const dataNote = ({ model }: Ctx): string => {
  const apart = model.headline.data?.apart;
  return apart ? SUMMARY.dataApart(apart.reserved, apart.copied, apart.sdk, apart.asset) : "";
};

export function assetCards({ model }: Ctx): Views["cards"] {
  const { assets } = model.headline;
  if (!assets) return { cards: [assetCard(model.headline)] };
  return {
        cards: [
      assetCard(model.headline),
      { id: "assets-extracted", big: `${percent(assets.extracted, assets.bytes, 1)}%`, title: SUMMARY.assetsExtracted, sub: SUMMARY.ofMegabytes(assets.extracted, assets.bytes), color: "var(--mute)" },
      { id: "assets-round-trip", big: `${percent(assets.roundTrip, assets.bytes, 2)}%`, title: SUMMARY.assetsRoundTrip, sub: SUMMARY.assetsRoundTripNote(assets.roundTrip), color: "var(--mute)" },
    ],
  };
}

/** One bar per asset kind, sized by bytes: decoded or copied as stored. */
export function assetKinds({ model }: Ctx): Views["meters"] {
  const kinds = [...(model.headline.assets?.kinds ?? [])].sort((a, b) => b.bytes - a.bytes);
  const peak = Math.max(...kinds.map((kind) => kind.bytes), 1);
  const color = (handling: string) => (handling === "decoded" ? "var(--tier-object)" : handling === "raw" ? "var(--mute)" : "var(--track)");
  return {
    key: ["decoded", "raw"].map((handling) => ({ label: SUMMARY.assetHandling[handling], color: color(handling) })),
    rows: kinds.map((kind) => ({
      label: kind.kind,
      aria: `${kind.kind}: ${SUMMARY.assetHandling[kind.handling] ?? kind.handling}, ${bytes(kind.bytes)}`,
      width: Math.max((kind.bytes / peak) * 100, 1),
      parts: [{ width: "100", color: color(kind.handling) }],
      count: bytes(kind.bytes),
      note: `${number(kind.entries)} ${kind.entries === 1 ? "file" : "files"} · ${SUMMARY.assetHandling[kind.handling] ?? kind.handling}` + (kind.round_trip_bytes ? ` · ${bytes(kind.round_trip_bytes)} round-trip` : ""),
    })),
  };
}

/** The SDK and the hand-written assembly, shown apart from the game totals. */
export const apart = ({ model }: Ctx): Views["text"] => ({
  paragraphs: [
    {
      label: SUMMARY.apartLabel,
      text: SUMMARY.apart(model.sdk.done, model.sdk.count, model.sdk.statuses.assembly.functions, model.hand.done, model.hand.count),
    },
  ],
});

export const overviewMeter = ({ model }: Ctx): Views["meters"] => ({ rows: [codeMeter(model.code, SUMMARY.statusHeading)] });

// Map --------------------------------------------------------------------------------------

export const mapTabs = (): Views["tabs"] => ({
  label: MAP.heading,
  tabs: [
    { id: "tiles", label: MAP.tabs.tiles },
    { id: "sdk", label: MAP.tabs.sdk },
  ],
});

/** Game code by part of the game: each group's heading and bar, then its images, biggest first. */
export function domains({ model }: Ctx): Views["domains"] {
  const { code } = model;
  const key = [
    { label: STATUS.pure.label, color: STATUS.pure.color, sub: MAP.key(code.exact, code.exactBytes) },
    { label: STATUS.nonmatching.label, color: STATUS.nonmatching.color, sub: MAP.key(code.draft, null) },
    { label: STATUS.open.label, color: STATUS.open.color, sub: MAP.key(code.functions - code.exact - code.draft, null) },
  ];
  const groups = model.groups
    .filter((group) => group.code.functions)
    .map((group) => {
      const images = group.targets.filter((target) => target.code.functions);
      const peak = Math.max(...images.map((target) => target.code.bytes), 1);
      const line = MAP.group(group.code.exact, group.code.functions, group.code.bytes, images.length);
      return {
        key: group.key,
        title: { label: group.label, to: { view: { kind: "group" as const, key: group.key } } },
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
          to: { view: { kind: "target" as const, id: target.id }, target: target.id, group: null, lib: null, part: "all" as const },
        })),
      };
    });
  return { key, keyHelp: MAP.statusHelp, groups };
}

/** The PsyQ legend; it doubles as the status filter of the SDK map. */
export function sdkLegend({ model }: Ctx): Views["legend"] {
  const scope: readonly Status[] = ["object", "assembly"];
  const items = STATUS_TABLE.filter(({ key }) => scope.includes(key)).map(({ key, label, color, phase }) => {
    const { functions, bytes: size } = model.sdk.statuses[key];
    return { key, label, color, phase, sub: SUMMARY.statusLine(functions, percent(size, model.sdk.bytes, 1), "SDK bytes") };
  });
  return { variant: "legend", label: MAP.filterHelp, items, help: { text: MAP.filterHelp, clear: MAP.filterClear } };
}

export const sdkHeading = ({ model }: Ctx): string => MAP.sdkTitle(percent(model.sdk.done, model.sdk.count, 2), model.sdk.done, model.sdk.count);

/** The same statuses as filter chips for the function browser. */
export const statusChips = (): Views["legend"] => ({
  variant: "chips",
  label: BROWSER.statusLabel,
  items: STATUS_TABLE.map(({ key, label, color, phase }) => ({ key, label, color, phase })),
});

/** The PsyQ SDK map: libraries, then their functions, zoomed to the library the route names. */
export function sdkTreemap(ctx: Ctx): Views["treemap"] {
  const { model, route, tokens } = ctx;
  const crumbs: Link[] = [{ label: MAP.scopes.sdk, to: { lib: null } }];
  if (route.lib) crumbs.push({ label: route.lib, to: { lib: route.lib } });
  // A game status stays in the route but must not dim this map.
  const statuses = route.st.filter((key) => key === "object" || key === "assembly");
  return { tree: treemapTree(model, { tokens, statuses }), focus: route.lib ? `l:${route.lib}` : null, crumbs, label: sdkHeading(ctx) };
}

// PsyQ SDK ---------------------------------------------------------------------------------

function libNote(lib: Library): string {
  const parts: string[] = [];
  const versions = Object.entries(lib.versions).map(([version, units]) => `${version} ×${units}`).join(" · ");
  if (versions) parts.push(SDK.versions(versions));
  if (lib.tiers.assembly) parts.push(SDK.assemblyOnly(lib.tiers.assembly));
  return parts.join(" · ");
}

export function sdkLibraries({ model }: Ctx): Views["meters"] {
  const peak = Math.max(...model.libraries.map((lib) => lib.count), 1);
  return {
    key: TIERS.map((tier) => ({ label: TIER_LABEL[tier], color: `var(--tier-${tier})` })),
    rows: model.libraries.map((lib) => {
      const assembly = lib.name === ASSEMBLY_LIBRARY;
      const done = SDK.done(lib.tiers.object, lib.count);
      return {
        name: { label: assembly ? SDK.assemblyLibrary : lib.name, to: { lib: lib.name, part: "sdk" }, scroll: "browse" },
        aria: assembly ? `${SDK.assemblyLibrary}: ${SDK.assemblyNote}` : `${lib.name}: ${done}`,
        width: Math.max((lib.count / peak) * 100, 1),
        parts: TIERS.filter((tier) => lib.tiers[tier]).map((tier) => ({ width: percent(lib.tiers[tier], lib.count, 3), color: `var(--tier-${tier})` })),
        count: assembly ? number(lib.count) : done,
        note: assembly ? SDK.assemblyNote : libNote(lib),
      };
    }),
  };
}

export const sdkKeyLine = ({ model }: Ctx): string => {
  const { statuses } = model.sdk;
  return SDK.keyLine(statuses.object.functions, statuses.assembly.functions);
};

// Data and quality -------------------------------------------------------------------------

export const dataHeading = ({ model }: Ctx): string => {
  const total = model.data;
  return total ? DATA.heading(percent(total.typed, total.bytes, 1), total.typed, total.bytes) : DATA.headingNone;
};

export function dataChart({ model, tokens }: Ctx): Views["chart"] {
  const rows = model.groups.flatMap((group) => (group.data ? [{ label: group.label, ...group.data }] : []));
  if (!rows.length) return null;
  const option = barOption(
    {
      categories: rows.map((row) => row.label),
      normalize: true,
      series: [
        { name: DATA.typed, color: tokens.status.pure, values: rows.map((row) => (100 * row.typed) / row.bytes) },
        { name: DATA.untyped, color: tokens.track, values: rows.map((row) => (100 * (row.bytes - row.typed)) / row.bytes) },
      ],
      describe: (i) => `<b>${rows[i].label}</b><br>${percent(rows[i].typed, rows[i].bytes, 1)}% · ${bytesOf(rows[i].typed, rows[i].bytes)}`,
    },
    tokens,
  );
  return { option, height: rows.length * BAR_HEIGHT + 30, label: DATA.help };
}

export const qualityCards = ({ model }: Ctx): Views["cards"] => ({
  narrow: true,
  small: true,
  cards: QUALITY.cards(model.quality).map(([title, big, sub]) => ({ id: title, title, big, sub })),
});

export function rebuildChart({ model, tokens }: Ctx): Views["chart"] {
  const rows = model.groups.filter((group) => group.code.draft);
  if (!rows.length) return null;
  const option = barOption(
    { categories: rows.map((group) => group.label), unit: "functions", series: [{ name: STATUS.nonmatching.label, color: tokens.status.nonmatching, values: rows.map((group) => group.code.draft) }] },
    tokens,
  );
  return { option, height: rows.length * BAR_HEIGHT + 30, label: QUALITY.perTargetHeading };
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

export const auditTable = ({ model }: Ctx): Views["table"] => ({
  disclosure: "Match quality of each image",
  columns: [{ label: "Image" }, { label: "Functions", align: "r" }, { label: "Rebuilt", align: "r" }, { label: "Drafts", align: "r" }, { label: "Code size", align: "r" }, { label: "Fuzzy", align: "r" }, { label: "Data typed" }],
  rows: model.groups.flatMap((group) => group.targets).map((t) => ({
    id: t.id,
    cells: [
      [{ text: t.name, to: { view: { kind: "target", id: t.id } } }, { text: t.id, code: true, mute: true, br: true }],
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
        also: { group: null },
        options: [{ value: "", label: BROWSER.allTargets }, ...model.groups.flatMap((group) => group.targets.map((t) => ({ value: t.id, label: t.name, group: group.label })))],
      },
      { label: BROWSER.libraryLabel, field: "lib", any: true, options: [{ value: "", label: BROWSER.allLibraries }, ...model.libraries.map((lib) => ({ value: lib.name, label: lib.name === ASSEMBLY_LIBRARY ? SDK.assemblyLibrary : lib.name }))] },
      { label: BROWSER.sortLabel, field: "sort", any: false, options: (Object.keys(BROWSER.sorts) as (keyof typeof BROWSER.sorts)[]).map((value) => ({ value, label: BROWSER.sorts[value] })) },
    ],
  };
}

/** Says that the list holds the report's functions when bin/status counts a different number. */
export const browserScope = ({ model }: Ctx): string => (model.game.count === model.code.functions ? "" : BROWSER.scope(model.game.count, model.code.functions));

export function browserTable({ model, route, limit }: Ctx): Views["table"] {
  const found = browse(model, route);
  const canReset = !!(route.q || route.st.length || route.part !== HOME.part || route.lib || route.target || route.group || route.sort !== HOME.sort || route.dir !== HOME.dir);
  return {
    columns: [
      { label: BROWSER.columns.function, sort: "name" },
      { label: BROWSER.columns.target },
      { label: BROWSER.columns.address, sort: "address" },
      { label: BROWSER.columns.status, sort: "status" },
      { label: BROWSER.columns.bytes, align: "r", sort: "size" },
    ],
    rows: found.slice(0, limit).map((fn) => ({
      id: fn.id,
      cells: [
        [{ text: fn.name, to: { view: { kind: "fn", id: fn.id } } }],
        [{ text: model.targetById.get(fn.target)?.name ?? "", mute: true }],
        [{ text: fn.addr || "-", code: true }],
        [{ text: "", status: fn.status }],
        [{ text: number(fn.bytes) }],
      ],
    })),
    message: !found.length ? BROWSER.none : found.length > limit ? BROWSER.limited(limit, found.length) : BROWSER.shown(found.length),
    actions: { canReset },
    more: found.length > limit ? BROWSER.more(PAGE_STEP) : undefined,
  };
}
