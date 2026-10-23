// Selectors: each turns the model and the route into the data one kind of view draws
// (viewtypes.ts). They are pure, so they run in Node as well as in the page.

import { BAR_HEIGHT, barOption } from "./charts/bars.ts";
import { latest, trendOption } from "./charts/trend.ts";
import { treemapTree } from "./charts/treemap.ts";
import { browse, PAGE_STEP } from "./model/browse.ts";
import { ASSEMBLY_LIBRARY } from "./model/report.ts";
import { bytes, number, percent } from "./model/format.ts";
import { TREND_CHARTS } from "./model/history.ts";
import { HOME } from "./model/route.ts";
import { STATUS, STATUS_TABLE, TIERS } from "./model/status.ts";
import { BROWSER, DATA, GROUPS, MAP, QUALITY, SDK, SUMMARY, TIER_LABEL, TREND } from "./strings.ts";
import type { Library, Status, Tally, Target } from "./types.ts";
import type { Card, Ctx, Link, MeterRow, Part, Views } from "./viewtypes.ts";

// Shared pieces ---------------------------------------------------------------------------

/** One bar split by status, by function count. */
export function statusMeter(tally: Tally, aria: string): MeterRow {
  const parts = STATUS_TABLE.flatMap(({ key, color }) => {
    const count = tally.statuses[key].functions;
    return count ? [{ width: percent(count, tally.count, 3), color }] : [];
  });
  return { aria, parts };
}

// Overview and groups ----------------------------------------------------------------------

/** The headline, in the order the numbers matter: bytes, fuzzy, functions, data. */
export function overviewCards({ model }: Ctx): Views["cards"] {
  const { game, data } = model;
  const cards: Card[] = [
    { id: "game-bytes", big: `${percent(game.doneBytes, game.bytes, 1)}%`, title: SUMMARY.gameBytes, sub: SUMMARY.ofBytes(game.doneBytes, game.bytes), color: STATUS.pure.color },
    { id: "fuzzy", big: `${game.fuzzy.toFixed(1)}%`, title: SUMMARY.fuzzy, sub: SUMMARY.fuzzyNote, color: STATUS.nonmatching.color },
    { id: "game", big: `${percent(game.done, game.count, 1)}%`, title: `${SUMMARY.gameFunctions}*`, sub: SUMMARY.of(game.done, game.count), color: STATUS.pure.color },
    data
      ? { id: "data", big: `${percent(data.typed, data.bytes, 2)}%`, title: SUMMARY.data, sub: SUMMARY.ofBytes(data.typed, data.bytes), color: "var(--st-typed)" }
      : { id: "data", big: SUMMARY.dataPending[0], title: SUMMARY.data, sub: SUMMARY.dataPending[1], color: "var(--mute)" },
  ];
  return { grid: "cards", cards };
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

export const overviewMeter = ({ model }: Ctx): Views["meters"] => ({ rows: [statusMeter(model.game, SUMMARY.statusHeading)] });

export function groupCards({ model }: Ctx): Views["cards"] {
  const cards = model.groups.map((group): Card => {
    const matched = GROUPS.functions(group.done, group.count);
    return {
      id: group.key,
      title: group.label,
      big: `${percent(group.done, group.count, 1)}%`,
      panel: {
        note: group.note,
        meter: statusMeter(group, `${group.label}: ${matched}`),
        line: `${matched} · ${GROUPS.targets(group.targets.length)} · ${bytes(group.bytes)}`,
        links: group.targets.map((target) => ({
          label: target.name,
          to: { view: { kind: "target", id: target.id } },
          scroll: "map",
          side: target.game.count ? `${percent(target.game.done, target.game.count, 0)}%` : "data only",
        })),
        action: { label: GROUPS.open, to: { view: { kind: "group", key: group.key }, map: "tiles" }, scroll: "map" },
      },
    };
  });
  return { grid: "group-grid", small: true, cards };
}

// Map --------------------------------------------------------------------------------------

export const mapTabs = (): Views["tabs"] => ({
  label: MAP.heading,
  tabs: [
    { id: "tiles", label: MAP.tabs.tiles },
    { id: "sdk", label: MAP.tabs.sdk },
  ],
});

export const mapHeading = ({ model, route }: Ctx): string => {
  const { game, sdk } = model;
  return route.map === "sdk" ? MAP.sdkTitle(percent(sdk.done, sdk.count, 2), sdk.done, sdk.count) : MAP.gameTitle(percent(game.done, game.count, 2), game.done, game.count);
};

export const mapHelp = ({ route }: Ctx): string => (route.map === "sdk" ? MAP.sdkHelp : MAP.tilesHelp);

/** The status legend of the map's current scope; it doubles as the status filter. */
export function legend({ model, route }: Ctx): Views["legend"] {
  const sdk = route.map === "sdk";
  const totals = sdk ? model.sdk : model.game;
  const denominator = sdk ? "SDK bytes" : "game code bytes";
  const scope: readonly Status[] = sdk ? ["object", "assembly"] : ["pure", "nonmatching", "open"];
  const items = STATUS_TABLE.filter(({ key }) => scope.includes(key)).map(({ key, label, color, phase }) => {
    const [functions, bytes] = [totals.statuses[key].functions, totals.statuses[key].bytes];
    return { key, label, color, phase, sub: SUMMARY.statusLine(functions, percent(bytes, totals.bytes, 1), denominator) };
  });
  return { variant: "legend", label: MAP.filterHelp, items, help: { text: MAP.filterHelp, clear: MAP.filterClear } };
}

/** The same statuses as filter chips for the function browser. */
export const statusChips = (): Views["legend"] => ({
  variant: "chips",
  label: BROWSER.statusLabel,
  items: STATUS_TABLE.map(({ key, label, color, phase }) => ({ key, label, color, phase })),
});

export function mapTreemap({ model, route, tokens }: Ctx): Views["treemap"] {
  const sdk = route.map === "sdk";
  const view = route.view;
  const group = view.kind === "group" ? model.groups.find((g) => g.key === view.key) : undefined;
  const target = view.kind === "target" ? model.targetById.get(view.id) : undefined;
  const focus = sdk ? (route.lib ? `l:${route.lib}` : null) : target ? `t:${target.id}` : group ? `g:${group.key}` : null;

  const crumbs: Link[] = [{ label: sdk ? MAP.scopes.sdk : MAP.scopes.game, to: sdk ? { lib: null } : { view: { kind: "home" } } }];
  if (!sdk) {
    const owner = target ? model.groups.find((g) => g.key === target.group) : group;
    if (owner) crumbs.push({ label: owner.label, to: { view: { kind: "group", key: owner.key } } });
    if (target) crumbs.push({ label: target.name, to: { view: { kind: "target", id: target.id } } });
  } else if (route.lib) crumbs.push({ label: route.lib, to: { lib: route.lib } });

  // A status of the other scope stays in the route but must not dim this map.
  const scope: readonly Status[] = sdk ? ["object", "assembly"] : ["pure", "nonmatching", "open"];
  const tree = treemapTree(model, sdk ? "sdk" : "game", { tokens, statuses: route.st.filter((key) => scope.includes(key)) });
  const label = sdk ? MAP.sdkTitle(percent(model.sdk.done, model.sdk.count, 2), model.sdk.done, model.sdk.count) : MAP.gameTitle(percent(model.game.done, model.game.count, 2), model.game.done, model.game.count);
  return { tree, scope: sdk ? "sdk" : "game", focus, crumbs, label };
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
  return total ? DATA.heading(percent(total.typed, total.bytes), total.typed, total.bytes) : DATA.headingNone;
};

export function dataChart({ model, tokens }: Ctx): Views["chart"] {
  const rows = model.targets.filter((t) => t.data && t.data.bytes).sort((a, b) => b.data!.bytes - a.data!.bytes);
  if (!rows.length) return null;
  const option = barOption(
    {
      categories: rows.map((t) => t.name),
      normalize: true,
      series: [
        { name: DATA.typed, color: tokens.status.pure, values: rows.map((t) => (100 * t.data!.typed) / t.data!.bytes) },
        { name: DATA.untyped, color: tokens.track, values: rows.map((t) => (100 * (t.data!.bytes - t.data!.typed)) / t.data!.bytes) },
      ],
      describe: (i) => `<b>${rows[i].name}</b><br>${percent(rows[i].data!.typed, rows[i].data!.bytes, 1)}% · ${number(rows[i].data!.typed)} / ${bytes(rows[i].data!.bytes)}`,
    },
    tokens,
  );
  return { option, height: rows.length * BAR_HEIGHT + 30, label: DATA.help };
}

export const qualityCards = ({ model }: Ctx): Views["cards"] => ({
  grid: "cards five",
  small: true,
  cards: QUALITY.cards(model.quality).map(([title, big, sub]) => ({ id: title, title, big, sub })),
});

export function rebuildChart({ model, tokens }: Ctx): Views["chart"] {
  const rows = model.targets.filter((t) => t.game.statuses.nonmatching.functions).sort((a, b) => b.game.statuses.nonmatching.functions - a.game.statuses.nonmatching.functions);
  if (!rows.length) return null;
  const option = barOption(
    { categories: rows.map((t) => t.name), unit: "functions", series: [{ name: "being rebuilt", color: tokens.status.nonmatching, values: rows.map((t) => t.game.statuses.nonmatching.functions) }] },
    tokens,
  );
  return { option, height: rows.length * BAR_HEIGHT + 30, label: QUALITY.perTargetHeading };
}

export function verification({ model }: Ctx): Views["text"] {
  const { game, data } = model;
  return {
    paragraphs: [
      { label: QUALITY.gameScope, text: QUALITY.gameScopeText(game.done, game.count, game.doneBytes, game.bytes) },
      { label: QUALITY.dataScope, text: QUALITY.dataScopeText(data?.typed ?? null, data?.bytes ?? null) },
    ],
  };
}

const dataCell = (target: Target): Part[] =>
  target.data ? [{ text: `${percent(target.data.typed, target.data.bytes, 1)}% · ${number(target.data.typed)} / ${bytes(target.data.bytes)}` }] : [{ text: "-", mute: true }];

export const auditTable = ({ model }: Ctx): Views["table"] => ({
  disclosure: "Match quality of each target",
  columns: [{ label: "Target" }, { label: "Functions", align: "r" }, { label: "Matched", align: "r" }, { label: "Code bytes", align: "r" }, { label: "Fuzzy", align: "r" }, { label: "Data typed" }],
  rows: model.targets.map((t) => ({
    id: t.id,
    cells: [
      [{ text: t.name, to: { view: { kind: "target", id: t.id } } }, { text: t.id, code: true, mute: true, br: true }],
      [{ text: number(t.game.count) }],
      [{ text: number(t.game.done) }],
      [{ text: bytes(t.game.bytes) }],
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
