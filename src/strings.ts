// Every sentence and label the page and the picture show. Change wording here and nowhere else.

import type { Quality, Status, Tier } from "./types.ts";
import { bytes, megabytes, number, percent, plural } from "./model/format.ts";

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
  "emi/bmagic": "Battle-effect overlays",
  "emi/boss": "Boss overlays",
  "emi/plchar": "Character overlays",
  "emi/scenario": "Scenario overlays",
  "emi/world": "World areas",
};
export const GROUP_NOTE: Record<string, string> = {
  "exe/main": "SLUS_004.22, the game's main program.",
  "exe/logo": "LOGO.EXE, the start-up screen program.",
  "emi/etc": "Overlays loaded by several parts of the game: menus, shops, saving and the title.",
  "emi/battle": "Overlays for fights.",
  "emi/bmagic": "One small program per battle effect, from the BMAGIC folder.",
  "emi/boss": "One small program per boss fight, from the BOSS folder.",
  "emi/plchar": "Character code overlays, from the PLCHAR folder.",
  "emi/scenario": "Overlays for story scenes.",
  "emi/world": "Code for the places you walk around, from the WORLD00 to WORLD04 folders.",
};
export const groupLabel = (key: string): string =>
  GROUP_LABEL[key] ?? `${(key.split("/").pop() ?? key).replace(/^./, (c) => c.toUpperCase())} overlays`;

export const SITE = {
  title: "Breath of Fire III decompilation status",
  description:
    "How much of Breath of Fire III (US) has been rebuilt as byte-exact C, how much of its data is typed, and which disc assets the tools read: game code, game data, assets, the PsyQ SDK and code quality.",
  noscript: "This page needs JavaScript to draw the charts. The same picture is available as",
  repoUrl: "https://github.com/raulcorreia7/rebof3-simple",
  loadFailed: (message: string) => `The status data could not be loaded (${message}).`,
  loadFailedReload: "Reload the page",
  loadFailedOpen: " or open ",
  loadFailedEnd: " directly.",
};

export const HEAD = {
  title: "Breath of Fire III decompilation",
  updated: "Updated",
  from: "from rebof3",
  getThe: "Get the",
  data: "report",
  or: "or the",
  picture: "full picture",
  theme: { auto: "Theme: automatic", light: "Theme: light", dark: "Theme: dark" },
};

export const SUMMARY = {
  gameHeading: "Game code",
  gameHelp:
    "Every function of the game's programs and overlays. A function counts as rebuilt when its C builds to the exact original bytes.",
  gameFunctions: "Game functions rebuilt in C",
  gameBytes: "Game code bytes rebuilt in C",
  unique: "Unique game code rebuilt in C",
  uniqueNote: (done: number, total: number) => `${number(done)} of ${number(total)}, each repeat counted once`,
  fuzzy: "Fuzzy match",
  fuzzyNote: "how close the code in the report is, weighted by bytes",
  data: "Game data typed in C",
  dataPending: ["from next run", "available after the next run"],
  dataHeading: "Game data",
  dataHelp:
    "The data bytes of the game's programs and overlays: tables, text and records. A byte counts as typed when C defines it with a real type.",
  dataRaw: "Game data still plain bytes in C",
  dataRawNote: "byte arrays still named by their address",
  dataApart: (reserved: number, copied: number, sdk: number, asset: number) =>
    `Not data to type, so left out of the total: ${bytes(reserved)} reserved (work areas that are zero on the disc and filled while the game runs), ` +
    `${bytes(copied)} copied from another program, ${bytes(sdk)} of PsyQ library data and ${bytes(asset)} of assets kept as the original files.`,
  assetsHeading: "Assets",
  assetsHelp:
    "The other files on the disc: pictures, sound, music, video, maps and tables. The asset tools read them from the original disc files; they are not part of the decompilation and never count in the figures above.",
  assetsDecoded: "Assets decoded to open formats",
  assetsExtracted: "Assets extracted from the disc",
  assetsRoundTrip: "Assets that round-trip",
  assetsRoundTripNote: (done: number) => `${bytes(done)} export and import back to the same bytes`,
  assetsPending: ["from next run", "measured by the next published run"],
  of: (done: number, total: number) => `${number(done)} of ${number(total)} functions`,
  ofBytes: (done: number, total: number) => `${number(done)} of ${bytes(total)}`,
  ofMegabytes: (done: number, total: number) => `${megabytes(done)} of ${megabytes(total)}`,
  footnote:
    "The same function often sits in several overlays, at a different address each time. Unique game code counts each one once, and counts it as rebuilt when any copy is.",
  mapNote: (shown: number, total: number) =>
    `The map, the groups and the function list show the ${number(shown)} game functions the objdiff report covers; the headline counts all ${number(total)} in the target maps.`,
  statusHeading: "Status of game code",
  statusLine: (functions: number, share: string, denominator: string) => `${number(functions)} functions · ${share}% of ${denominator}`,
  apartLabel: "Shown apart",
  apart: (sdkDone: number, sdkCount: number, sdkAssembly: number, handDone: number, handCount: number) =>
    `PsyQ SDK: ${number(sdkDone)} of ${number(sdkCount)} units from original objects` +
    (sdkAssembly ? `, ${number(sdkAssembly)} kept as assembly` : "") +
    `. Hand-written assembly: ${number(handDone)} of ${number(handCount)} exact. Neither is counted in game code.`,
  assetKinds: "Assets by kind",
  assetKindsHelp: "One bar per kind of file, sized by its bytes on the disc. Teal is decoded to an open format, grey is copied as stored.",
  assetHandling: { decoded: "decoded", raw: "copied as stored", none: "not extracted" } as Record<string, string>,
};

export const GROUPS = {
  heading: "Game code by part of the game",
  intro: "The executables first, then the overlay groups, biggest game code first. Open a group to see its targets, biggest first, and to find it on the map.",
  functions: (done: number, total: number) => `${number(done)} / ${number(total)} matched`,
  targets: (count: number) => plural(count, "target"),
  data: (typed: number, total: number) => `data ${percent(typed, total, 1)}% typed of ${bytes(total)}`,
  open: "Show on the map",
  openAll: (count: number) => `Show all ${number(count)} targets on the map`,
};

export const MAP = {
  heading: "Map",
  tabs: { tiles: "Function map", sdk: "PsyQ SDK" },
  scopes: { game: "Game code", sdk: "PsyQ SDK" },
  gameTitle: (done: number, total: number) => `Game code in the report: ${number(done)} of ${number(total)} units rebuilt in C`,
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
  heading: (percent: string, typed: number, total: number) => `Game data: ${percent}% typed in C (${number(typed)} / ${bytes(total)})`,
  headingNone: "Game data",
  help: "One bar per part of the game, executables first. The green part is typed in C; byte arrays still named by their address are not. Each target is capped at its data bytes, so no bar passes 100%. The match quality table lists every target.",
  typed: "typed in C",
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
  perTargetHeading: "Functions being rebuilt by part of the game",
  perTargetHelp: "One bar per part of the game: the game functions with a draft that does not build to the original bytes yet.",
  verifyHeading: "How the numbers are counted",
  gameScope: "Game code:",
  gameScopeText: (done: number, total: number, doneBytes: number, totalBytes: number) =>
    `${number(done)} of ${number(total)} functions match, ${number(doneBytes)} of ${bytes(totalBytes)}, from bin/status over every target map. The PsyQ SDK and the hand-written assembly are not counted.`,
  dataScope: "Game data:",
  dataScopeText: (typed: number | null, totalBytes: number | null, rawC: number | null) =>
    typed === null || totalBytes === null
      ? "not measured in this run."
      : `${number(typed)} of ${bytes(totalBytes)} of data are typed in C, from the data census.` +
        (rawC ? ` Another ${bytes(rawC)} are in C as byte arrays still named by their address, and do not count.` : ""),
  assetScope: "Assets:",
  assetScopeText: (decoded: number | null, total: number | null) =>
    decoded === null || total === null
      ? "not measured in this run."
      : `${megabytes(decoded)} of the ${megabytes(total)} of disc files that are not program code decode to open formats, from bin/rebof3 assets. Never counted as decompilation.`,
};

export const TREND = {
  heading: "Progress over time",
  help:
    "One point per day. The number in each title is the latest value. Since the unique game code chart starts, game code counts every function in the target maps, not only the ones the objdiff report covers, and typed data leaves out byte arrays still named by their address; earlier points use the old counts.",
  empty: "starts with the next published run",
  charts: {
    gameFunctions: "Game functions rebuilt in C over time",
    gameBytes: "Game code bytes rebuilt in C over time",
    gameUnique: "Unique game code rebuilt in C over time",
    sdk: "PsyQ SDK from original objects over time",
    data: "Game data typed in C over time",
    assets: "Asset bytes decoded over time",
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
