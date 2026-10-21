// Every sentence and label the page and the picture show. Change wording here and nowhere else.

import type { DataStatus, Quality, LayoutSummary, Status, Tier } from "./types.ts";
import { number, plural } from "./model/format.ts";

// Status key -> legend text. The order of the keys is the order of the legend.
export const STATUS_LABEL: Record<Status, string> = {
  pure: "matched C",
  fake_match: "matched C with fake-match tricks",
  asm: "original assembly, exact",
  object: "PsyQ library object",
  assembly: "PsyQ library assembly",
  nonmatching: "C in progress, not exact yet",
  open: "not started (assembly)",
};

// Map rows that are not functions (strips only).
export const DATA_LABEL: Record<DataStatus | "reserved", string> = {
  typed: "data typed in C",
  raw: "data and raw bytes",
  header: "file header",
  reserved: "reserved space",
};

// PsyQ match tier -> legend text, best first.
export const TIER_LABEL: Record<Tier, string> = {
  c: "exact C",
  object: "exact object",
  partial: "partial match",
  assembly: "assembly only",
  unmatched: "unmatched",
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
  title: "Breath of Fire III (US): decompilation status",
  updated: "Updated",
  from: "from rebof3",
  getThe: "Get the",
  data: "data",
  or: "or the",
  picture: "full picture",
  theme: { auto: "Theme: automatic", light: "Theme: light", dark: "Theme: dark" },
};

export const SUMMARY = {
  gameFunctions: "Game code matched",
  gameBytes: "Game code bytes matched",
  sdk: "PsyQ SDK as object or C",
  data: "Data typed in C",
  dataPending: ["from next run", "available after the next run"],
  of: (done: number, total: number) => `${number(done)} of ${number(total)} functions`,
  ofBytes: (done: number, total: number) => `${number(done)} of ${number(total)} B`,
  footnote:
    "* Game code means every function outside the PsyQ SDK. A function counts as matched when it builds to the exact original bytes, whether that is clean C, C with fake-match tricks or the original assembly." +
    " An SDK function counts as done when it links from an original PsyQ object or is exact C.",
  statusHeading: "Status of every function",
  statusLine: (functions: number, share: string) => `${number(functions)} functions · ${share}% of code bytes`,
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
  tabs: { tiles: "Function map", strips: "Address strips" },
  scopes: { game: "Game code", sdk: "PsyQ SDK" },
  gameTitle: (percent: string, done: number, total: number) => `Game code: ${percent}% matched (${number(done)} / ${number(total)})`,
  sdkTitle: (percent: string, done: number, total: number) => `PsyQ SDK: ${percent}% object or C (${number(done)} / ${number(total)})`,
  tilesHelp:
    "Each rectangle is one function and bigger code takes more room. Hover one to see which function it is, click a block to zoom in and click a function to inspect it.",
  sdkHelp: "One block per PsyQ library. Teal links from original objects, orange from original assembly, and green has been rewritten as C.",
  filterHelp: "The legend is a filter: choose statuses to light them up and dim the rest.",
  filterClear: "Show every status",
  stripsHelp:
    "Each target's address range wraps into rows like text, from the first byte to the last. Hover a block to see what it is and click it to inspect it.",
  showReserved: "show reserved space",
  reservedHelp:
    "Reserved space is the executable's load slots, the loader tail and the Splat map's pad and gap rows. They are hidden by default so the real bytes fill the strip.",
  scale: (bytes: number) => `1 px = ${bytes} B`,
  imageLinked: (verdict: string) => `image ${verdict}`,
  imageNotLinked: "image not linked",
  gamePercent: (percent: string) => `${percent}% of game code matched`,
  textFallback: "The map is drawn on a canvas. The function browser below lists the same functions with the same filters.",
};

export const SDK = {
  heading: "PsyQ libraries, best match first",
  help: "One bar per library, split by how well the retail code matches PsyQ: exact C, exact object (the PsyQ version it links from), partial match, assembly only, unmatched. Choose a library to browse its functions, best match first.",
  keyLine: (objects: number, assembly: number, c: number) => `${number(objects)} objects · ${number(assembly)} assembly · ${number(c)} C · done = exact C or exact object`,
  versions: (text: string) => `objects from PsyQ ${text}`,
  partial: (count: number) => `${count} partial`,
  assemblyOnly: (count: number) => `${count} assembly only`,
  unmatched: (count: number) => `${count} unmatched`,
  noMatch: "no match",
  browse: "Browse functions",
  done: (done: number, total: number) => `${number(done)} / ${number(total)}`,
};

export const DATA = {
  heading: (percent: string, typed: number, bytes: number) => `Data: ${percent}% typed in C (${number(typed)} / ${number(bytes)} B)`,
  headingNone: "Data",
  help: "Each bar is one target's data. The green part is already typed in C.",
  typed: "typed in C",
  untyped: "not typed yet",
};

export const QUALITY = {
  heading: "Code quality",
  cards: (q: Quality): [string, string, string][] => [
    ["Fake matches in use", number(q.fakes), `${number(q.benign_fakes)} harmless · ${number(q.harmful_fakes)} harmful`],
    ["FIELD uses", number(q.field_ref), "raw offset accesses in C"],
    ["Local externs", number(q.local_externs), "extern declarations inside C files"],
    ["Symbol conflicts", number(q.sym_conflicts), "places where the symbol list disagrees"],
    ["Hand-written assembly", number(q.hand_asm), "files kept as assembly by hand"],
  ],
  sentence: (q: Quality) =>
    `${plural(q.fakes, "fake match", "fake matches")} in use: ${number(q.benign_fakes)} harmless and ${number(q.harmful_fakes)} harmful.` +
    ` The C still has ${plural(q.field_ref, "raw offset access", "raw offset accesses")} (FIELD uses), ${plural(q.local_externs, "local extern")}, ${plural(q.sym_conflicts, "symbol conflict")} and ${plural(q.hand_asm, "hand-written assembly file")}.`,
  perTargetHeading: "Fake-match functions by target",
  perTargetHelp:
    "The project records the quality counters above as totals only. The one per-target figure is how many functions rely on a fake-match trick, shown here.",
  verifyHeading: "Verification",
  imageLinks: (exact: number, total: number) => `${exact} of ${total} targets link byte-identical to the retail binary`,
  imageLinksUnknown: "not measured in this run.",
  differs: (names: string[]) => `; ${names.join(", ")} ${names.length > 1 ? "differ" : "differs"}.`,
  firstDifference: (address: string) => `first difference at ${address}`,
  addressMap: (layout: LayoutSummary) =>
    `${number(layout.rows)} map rows; ${layout.gaps} gaps and ${layout.overlaps} overlaps between rows; ${layout.problems} differences that touch code.`,
  addressMapNotes: (layout: LayoutSummary) =>
    ` Against these rows, the units behind bin/status place ${layout.relocated} raw rows of the executables at another address, lack ${layout.unmodelled} rows of top-level segments and size ${layout.resized} data rows too large. None of them is a function.`,
};

export const TREND = {
  heading: "Progress over time",
  help: "One point per day. The number in each title is the latest value.",
  empty: "starts with the next published run",
  charts: {
    gameFunctions: "Matched functions over time",
    gameBytes: "Matched code bytes over time",
    sdk: "PsyQ SDK as object or C over time",
    data: "Data typed in C over time",
    fakes: "Fake matches in use over time",
    harmful: "Harmful fake matches over time",
    fieldRef: "FIELD uses over time",
    localExterns: "Local externs over time",
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
  scopes: { all: "Everything", game: "Game code", sdk: "PsyQ SDK" },
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
    tier: "Match",
    version: "PsyQ version",
    score: "Words reproduced",
    previous: "Previous function",
    next: "Next function",
    range: "Address range",
    functions: "Functions",
    bytes: "Code bytes",
    data: "Data typed in C",
    link: "Image link",
    payload: "Payload",
    linked: "Linked",
    fromC: "Bytes from C",
    fromAssembly: "Bytes from assembly",
    mismatch: "First difference",
    audit: "Map audit",
    counts: "Counts",
    targets: "Targets",
  },
  parts: { game: "Game code", sdk: "PsyQ SDK" },
  noSource: "No C file yet: this function is still the original assembly.",
  sourceNote: "The file name follows the project's naming rule, and the link points at the commit this page was measured at.",
  noSourceSdk: "Linked from the original PsyQ library, so there is no C file.",
  showOnMap: "Show on the map",
  browseTarget: "Browse its functions",
  clean: "clean",
  notLinked: "not linked",
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
  librariesHelp: "How far along each library is, function by function, and which PsyQ releases its objects come from.",
  libraryKey: (objects: number, assembly: number, c: number) => `${number(objects)} objects · ${number(assembly)} assembly · ${number(c)} C`,
  libraryLinked: "linked from original assembly",
  badge: "C match",
};
