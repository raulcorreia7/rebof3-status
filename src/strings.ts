// Every sentence and label the page and the picture show. Change wording here and nowhere else.

import type { Quality, Status, Tier } from "./types.ts";
import { bytes, number, plural } from "./model/format.ts";

// Status key -> legend text. The order of the keys is the order of the legend.
export const STATUS_LABEL: Record<Status, string> = {
  pure: "rebuilt in C",
  nonmatching: "being rebuilt",
  open: "not started",
  object: "PsyQ library object",
  asm: "hand-written assembly",
  assembly: "assembly only",
};

// PsyQ unit kind -> legend text, best first.
export const TIER_LABEL: Record<Tier, string> = {
  object: "exact object",
  assembly: "assembly only",
};

// Group key -> heading. A key that is not listed gets a title-cased heading.
export const GROUP_LABEL: Record<string, string> = {
  "exe/main": "Main executable",
  "exe/logo": "Logo executable",
  "emi/etc": "Shared overlays",
  "emi/battle": "Battle overlays",
  "emi/scenario": "Scenario overlays",
  "emi/world00": "World areas",
};
export const GROUP_NOTE: Record<string, string> = {
  "exe/main": "SLUS_004.22, the game's main program.",
  "exe/logo": "LOGO.EXE, the start-up screen program.",
  "emi/etc": "Overlays loaded by several parts of the game: menus, shops, saving and the title.",
  "emi/battle": "Overlays for fights.",
  "emi/scenario": "Overlays for story scenes.",
  "emi/world00": "Overlays for the places you walk around.",
};
export const groupLabel = (key: string): string =>
  GROUP_LABEL[key] ?? `${(key.split("/").pop() ?? key).replace(/^./, (c) => c.toUpperCase())} overlays`;

export const SITE = {
  title: "Breath of Fire III decompilation status",
  description:
    "How much of Breath of Fire III (US) has been rebuilt as byte-exact C: game code, the PsyQ SDK, typed data and code quality.",
  noscript: "This page needs JavaScript to draw the charts. The same picture is available as",
  repoUrl: "https://github.com/raulcorreia7/rebof3-simple",
  loadFailed: (message: string) => `The status data could not be loaded (${message}).`,
  loadFailedReload: "Reload the page",
  loadFailedOpen: " or open ",
  loadFailedEnd: " directly.",
};

export const HEAD = {
  title: "Game code rebuilt in C",
  updated: "Updated",
  from: "from rebof3",
  getThe: "Get the",
  data: "report",
  or: "or the",
  picture: "full picture",
  theme: { auto: "Theme: automatic", light: "Theme: light", dark: "Theme: dark" },
};

export const SUMMARY = {
  gameFunctions: "Game code rebuilt in C",
  gameBytes: "Game code matched by bytes",
  fuzzy: "Fuzzy match",
  fuzzyNote: "average weighted by code bytes",
  data: "Data typed and named",
  dataPending: ["from next run", "available after the next run"],
  of: (done: number, total: number) => `${number(done)} of ${number(total)} functions`,
  ofBytes: (done: number, total: number) => `${number(done)} of ${bytes(total)}`,
  footnote:
    "* Game code means every function outside the PsyQ SDK and the hand-written assembly. A function counts as rebuilt when it builds to the exact original bytes." +
    " The SDK and the hand-written assembly are shown apart and are not counted in these figures.",
  statusHeading: "Status of game code",
  statusLine: (functions: number, share: string, denominator: string) => `${number(functions)} functions · ${share}% of ${denominator}`,
  apartLabel: "Shown apart",
  apart: (sdkDone: number, sdkCount: number, sdkAssembly: number, handDone: number, handCount: number) =>
    `PsyQ SDK: ${number(sdkDone)} of ${number(sdkCount)} units from original objects` +
    (sdkAssembly ? `, ${number(sdkAssembly)} kept as assembly` : "") +
    `. Hand-written assembly: ${number(handDone)} of ${number(handCount)} exact. Neither is counted above.`,
};

export const GROUPS = {
  heading: "Where the work stands",
  intro: "Game code grouped by the part of the game it belongs to. Open a group to see it on the map.",
  functions: (done: number, total: number) => `${number(done)} / ${number(total)} matched`,
  targets: (count: number) => plural(count, "target"),
  open: "Show on the map",
};

export const MAP = {
  heading: "Map",
  tabs: { tiles: "Function map", sdk: "PsyQ SDK" },
  scopes: { game: "Game code", sdk: "PsyQ SDK" },
  gameTitle: (percent: string, done: number, total: number) => `Game code: ${percent}% matched (${number(done)} / ${number(total)})`,
  sdkTitle: (percent: string, done: number, total: number) => `PsyQ SDK: ${percent}% objects (${number(done)}/${number(total)})`,
  tilesHelp:
    "Each rectangle is one function and bigger code takes more room. Hover one to see which function it is, click a block to zoom in and click a function to inspect it.",
  sdkHelp: "One block per PsyQ library. Teal links from original objects and orange is kept as assembly.",
  filterHelp: "The legend is a filter: choose statuses to light them up and dim the rest.",
  filterClear: "Show every status",
  textFallback: "The map is drawn on a canvas. The function browser below lists the same functions with the same filters.",
};

export const SDK = {
  heading: "PsyQ libraries, best match first",
  help: "One bar per library, split by whether the unit links from an original PsyQ object or is kept as assembly. Choose a library to browse its functions. The SDK is shown apart and is not counted in the game figures.",
  keyLine: (objects: number, assembly: number) =>
    `${number(objects)} objects · ${number(assembly)} assembly · shown apart, not counted`,
  versions: (text: string) => `objects from PsyQ ${text}`,
  assemblyOnly: (count: number) => `${number(count)} kept as assembly`,
  browse: "Browse functions",
  done: (objects: number, total: number) => `${number(objects)} / ${number(total)}`,
  assemblyLibrary: "assembly only",
  assemblyNote: "kept as assembly",
};

export const DATA = {
  heading: (percent: string, typed: number, total: number) => `Data: ${percent}% typed and named (${number(typed)} / ${bytes(total)})`,
  headingNone: "Data",
  help: "Each bar is one target's data. The green part is already typed and named in C. A target is capped at its data bytes, so no bar passes 100%.",
  typed: "typed and named",
  untyped: "not typed yet",
};

export const QUALITY = {
  heading: "Match quality",
  cards: (q: Quality): [string, string, string][] => [
    ["Functions matched", number(q.exact), "exact C, byte for byte"],
    ["Being rebuilt", number(q.inProgress), "functions with a draft that is not exact yet"],
    ["Not started", number(q.notStarted), "functions still the original assembly"],
    ["Fuzzy match", `${q.fuzzy.toFixed(1)}%`, "code bytes weighted average"],
    ["Hand-written asm", `${number(q.handDone)} / ${number(q.hand)}`, "exact, shown apart"],
  ],
  sentence: (q: Quality) =>
    `${number(q.exact)} game functions build to the original bytes, ${number(q.inProgress)} are being rebuilt and ${number(q.notStarted)} are still the original assembly.` +
    ` The fuzzy match is ${q.fuzzy.toFixed(1)}%, and ${number(q.handDone)} of ${plural(q.hand, "hand-written assembly unit")} are exact.`,
  perTargetHeading: "Functions being rebuilt by target",
  perTargetHelp: "One bar per target: the game functions with a draft that does not build to the original bytes yet.",
  verifyHeading: "How the numbers are counted",
  gameScope: "Game code:",
  gameScopeText: (done: number, total: number, doneBytes: number, totalBytes: number) =>
    `${number(done)} of ${number(total)} functions match, ${number(doneBytes)} of ${bytes(totalBytes)}. The PsyQ SDK and the hand-written assembly are not counted.`,
  dataScope: "Data:",
  dataScopeText: (typed: number | null, totalBytes: number | null) =>
    typed === null || totalBytes === null ? "not measured in this run." : `${number(typed)} of ${bytes(totalBytes)} of data are typed and named in C, from the data census.`,
};

export const TREND = {
  heading: "Progress over time",
  help: "One point per day. The number in each title is the latest value. The quality counters stop when the report became the source.",
  empty: "starts with the next published run",
  charts: {
    gameFunctions: "Game functions rebuilt in C over time",
    gameBytes: "Game code bytes rebuilt in C over time",
    sdk: "PsyQ SDK from original objects over time",
    data: "Data typed and named over time",
    benign: "Benign helper macros over time",
    harmful: "Harmful helper macros over time",
    fieldRef: "Raw offset accesses over time",
    localExterns: "Declarations inside .c files over time",
  },
};

export const BROWSER = {
  heading: "Browse every function",
  searchPlaceholder: "Search by name, address or status",
  searchLabel: "Search functions",
  statusLabel: "Status",
  targetLabel: "Target",
  allTargets: "Every target",
  scopeLabel: "Part",
  scopes: { all: "Everything", game: "Game code", sdk: "PsyQ SDK", hand: "Hand-written assembly" },
  libraryLabel: "Library",
  allLibraries: "Every library",
  sortLabel: "Sort by",
  sorts: { address: "Address", size: "Size", name: "Name", status: "Status" },
  columns: { function: "Function", target: "Target", address: "Address", status: "Status", bytes: "Bytes" },
  reset: "Clear filters",
  none: "No function matches. Try a shorter search.",
  limited: (shown: number, total: number) => `Showing the first ${number(shown)} of ${number(total)} functions. Type more to narrow it down.`,
  shown: (count: number) => `${plural(count, "function")} shown.`,
  more: (step: number) => `Show ${number(step)} more`,
  share: "Copy link to this view",
  copied: "Link copied",
};

export const INSPECT = {
  close: "Close",
  copyLink: "Copy link",
  copied: "Link copied",
  function: "Function",
  target: "Target",
  group: "Group",
  fields: {
    name: "Name",
    address: "Address",
    ends: "Ends at",
    size: "Size",
    status: "Status",
    part: "Part",
    target: "Target",
    group: "Group",
    source: "Source file",
    library: "Library",
    tier: "Kind",
    version: "PsyQ version",
    score: "Fuzzy match",
    previous: "Previous function",
    next: "Next function",
    functions: "Functions",
    bytes: "Code bytes",
    data: "Data typed and named",
    payload: "Payload",
    targets: "Targets",
  },
  parts: { game: "Game code", sdk: "PsyQ SDK", hand: "Hand-written assembly" },
  noSource: "No C file: this function is still the original assembly.",
  sourceNote: "The file name follows the project's naming rule, and the link points at the commit this page was measured at.",
  objectNote: "The unit was sliced from this PsyQ object; the SDK is shown apart.",
  noSourceSdk: "Linked from the original PsyQ library, so there is no C file.",
  noSourceAssembly: "Kept as assembly: no PsyQ object reproduces it and there is no C file.",
  showOnMap: "Show on the map",
  browseTarget: "Browse its functions",
  notFound: "That function is not in the data. It may have been renamed since this link was made.",
};

export const FOOT = {
  generated: "Everything here is generated from",
  doNotEdit: ", so please do not edit it by hand.",
};

// Picture only.
export const POSTER = {
  title: "Breath of Fire III decompilation status",
  subtitle: (commit: string, date: string) => `rebof3 ${commit} · ${date} · one square per function, sized by its code bytes`,
  libraries: "PsyQ libraries and versions",
  libraryKey: (objects: number, assembly: number) => `${number(objects)} objects · ${number(assembly)} assembly`,
  libraryLinked: "kept as assembly",
  badge: "C match",
};
