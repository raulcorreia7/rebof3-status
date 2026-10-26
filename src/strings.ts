// Every sentence and label the page and the picture show. Change wording here and nowhere else.

import type { Quality, Status, Tier } from "./types.ts";
import { bytes, bytesOf, number, plural } from "./model/format.ts";

// Status key -> legend text. The order of the keys is the order of the legend.
export const STATUS_LABEL: Record<Status, string> = {
  pure: "rebuilt in C",
  nonmatching: "draft in C",
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

// Group key -> heading and note (model/groups.ts names the groups).
export const GROUP_LABEL: Record<string, string> = {
  main: "Main program",
  system: "Game system and menus",
  battle: "Battle",
  magic: "Battle magic",
  bosses: "Bosses",
  characters: "Characters",
  world: "World areas",
  scenario: "Scenario and cutscenes",
  other: "Other",
};
export const GROUP_NOTE: Record<string, string> = {
  main: "SLUS_004.22, the game's main program, and LOGO.EXE, the start-up screen.",
  system: "GAME.EMI and the overlays for the title, menus, shops and saving, from the ETC folder.",
  battle: "BATTLE.EMI and the BATL and BATE overlays that run a fight.",
  magic: "One small program per battle effect, from the BMAGIC folder.",
  bosses: "One small program per boss fight, from the BOSS folder.",
  characters: "Character code overlays, from the PLCHAR folder.",
  world: "One program per place you walk around, from the WORLD00 to WORLD04 folders.",
  scenario: "Story scenes and their effects, from the SCENARIO folder.",
  other: "Programs no rule names yet.",
};

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
  gameBytes: "Game code rebuilt in C, by size",
  unique: "Game functions without duplicates",
  uniqueNote: (done: number, total: number) => `${number(done)} of ${number(total)} rebuilt in C`,
  fuzzy: "Fuzzy match",
  fuzzyNote: "how close the code in the report is, weighted by bytes",
  data: "Game data written as typed C",
  dataPending: ["from next run", "available after the next run"],
  dataHeading: "Game data",
  dataHelp:
    "The data bytes of the game's programs and overlays: tables, text and records. A byte counts as typed when C defines it with a real type.",
  dataRaw: "Game data still raw bytes in C",
  dataRawNote: "byte arrays still named by their address",
  dataApart: (reserved: number, copied: number, sdk: number, asset: number) =>
    `Not data to type, so left out of the total: ${bytes(reserved)} reserved (work areas that are zero on the disc and filled while the game runs), ` +
    `${bytes(copied)} copied from another program, ${bytes(sdk)} of PsyQ library data and ${bytes(asset)} of assets kept as the original files.`,
  assetsHeading: "Assets",
  assetsHelp:
    "The other files on the disc: pictures, sound, music, video, models, maps and tables. They stay in the original disc files and the game loads them from there; they are not part of the decompilation and never count in the figures above. Converted means the asset tools turn a file into a standard format anyone can open: pictures to PNG, sound to WAV, music to MIDI, models to OBJ or glTF, tables and text to JSON.",
  assetsDecoded: "Assets converted to standard files",
  assetsExtracted: "Assets extracted from the disc",
  assetsRoundTrip: "Assets that convert back byte for byte",
  assetsRoundTripNote: (done: number) => `${bytes(done)} convert to a standard file and back to the exact original`,
  assetsPending: ["from next run", "measured by the next published run"],
  of: (done: number, total: number) => `${number(done)} of ${number(total)} functions`,
  ofBytes: (done: number, total: number) => bytesOf(done, total),
  ofMegabytes: (done: number, total: number) => bytesOf(done, total),
  footnote:
    "Many overlays carry copies of the same function. The card without duplicates counts each function once, as rebuilt when any copy is.",
  statusHeading: "Status of game code",
  statusLine: (functions: number, share: string, denominator: string) => `${number(functions)} functions · ${share}% of ${denominator}`,
  apartLabel: "Shown apart",
  apart: (sdkDone: number, sdkCount: number, sdkAssembly: number, handDone: number, handCount: number) =>
    `PsyQ SDK: ${number(sdkDone)} of ${number(sdkCount)} units from original objects` +
    (sdkAssembly ? `, ${number(sdkAssembly)} kept as assembly` : "") +
    `. Hand-written assembly: ${number(handDone)} of ${number(handCount)} exact. Neither is counted in game code.`,
  assetKinds: "Assets by kind",
  assetKindsHelp: "One bar per kind of file, sized by its size on the disc. Teal is converted to a standard file (PNG, WAV, MIDI, OBJ, JSON), grey is extracted as stored.",
  assetHandling: { decoded: "converted", raw: "extracted as stored", none: "not extracted" } as Record<string, string>,
};

export const MAP = {
  heading: "Game code by part of the game",
  help: "One block per part of the game, then one bar or tile per program image, biggest first. Click an image or part heading to open its treemap.",
  statusHelp:
    "Draft in C: C that builds but does not match the original yet. Not started: still the original assembly, also when a C file only includes it.",
  key: (functions: number, size: number | null) => (size === null ? plural(functions, "function") : `${plural(functions, "function")} · ${bytes(size)}`),
  group: (done: number, total: number, size: number, images: number) => `${number(done)} of ${plural(total, "function")} · ${bytes(size)} · ${plural(images, "image")}`,
  image: (done: number, total: number) => `${number(done)} of ${number(total)}`,
  imageAria: (name: string, done: number, draft: number, total: number, size: number) =>
    `${name}: ${number(done)} of ${plural(total, "function")} rebuilt in C, ${number(draft)} draft, ${bytes(size)}`,
  back: "Back to sections",
  chartLabel: (title: string, functions: number) => `${title}: treemap of ${number(functions)} report function rows`,
  functionHeading: (count: number) => `Functions in report.json (${number(count)})`,
  functionSource: "status.json has no per-function rows. report.json supplies names, addresses, code-byte sizes, C status and fuzzy match when present; the treemap and list use the same rows. Zero-byte rows get a 1-byte display weight.",
  scopeSummary: (statusFunctions: number, statusBytes: number, reportFunctions: number, reportBytes: number) =>
    `${number(statusFunctions)} game functions · ${bytes(statusBytes)} from status.json; ${number(reportFunctions)} report rows · ${bytes(reportBytes)} from report.json.`,
  coverage: (reportFunctions: number, statusFunctions: number, reportBytes: number, statusBytes: number) => {
    const functionNote =
      reportFunctions < statusFunctions
        ? `${number(statusFunctions - reportFunctions)} fewer per-function rows in report.json than game functions counted by status.json.`
        : reportFunctions > statusFunctions
          ? `${number(reportFunctions - statusFunctions)} more per-function rows in report.json than game functions counted by status.json.`
          : `report.json and status.json count the same number of game functions.`;
    if (reportBytes === statusBytes) return functionNote;
    const difference = reportBytes > statusBytes ? reportBytes - statusBytes : statusBytes - reportBytes;
    const direction = reportBytes > statusBytes ? "more" : "less";
    return `${functionNote} Report rows sum to ${bytes(reportBytes)}, ${bytes(difference)} ${direction} than status.json's ${bytes(statusBytes)}.`;
  },
  listEmpty: "No per-function rows in report.json.",
  detailHeading: "Selected function",
  fields: { name: "Name", address: "Address", size: "Size", status: "Status", fuzzy: "Fuzzy match" },
  showMoreFunctions: (count: number) => `Show ${number(count)} more functions`,
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
  heading: (percent: string, typed: number, total: number) => `Game data: ${percent}% typed in C (${bytesOf(typed, total)})`,
  headingNone: "Game data",
  help: "One bar per part of the game. The green part is typed in C; byte arrays still named by their address are not. Each image is capped at its data bytes, so no bar passes 100%. The match quality table lists every image.",
  typed: "typed in C",
  untyped: "not typed yet",
};

export const QUALITY = {
  heading: "Match quality",
  cards: (q: Quality): [string, string, string][] => [
    ["Functions matched", number(q.exact), "exact C, byte for byte"],
    ["Drafts in C", number(q.inProgress), "functions in C that do not match yet"],
    ["Not started", number(q.notStarted), "functions still the original assembly"],
    ["Fuzzy match", `${q.fuzzy.toFixed(1)}%`, "code bytes weighted average"],
    ["Hand-written asm", `${number(q.handDone)} / ${number(q.hand)}`, "exact, shown apart"],
  ],
  sentence: (q: Quality) =>
    `${number(q.exact)} game functions build to the original bytes, ${number(q.inProgress)} are drafts in C and ${number(q.notStarted)} are still the original assembly.` +
    ` The fuzzy match is ${q.fuzzy.toFixed(1)}%, and ${number(q.handDone)} of ${plural(q.hand, "hand-written assembly unit")} are exact.`,
  perTargetHeading: "Drafts in C by part of the game",
  perTargetHelp: "One bar per part of the game: game functions in C that do not build to the original bytes yet.",
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
      : `${bytes(decoded)} of the ${bytes(total)} of disc files that are not program code convert to standard files (PNG, WAV, MIDI, OBJ, JSON), from bin/rebof3 assets. Never counted as decompilation.`,
};

export const TREND = {
  heading: "Progress over time",
  help:
    "One point per day. The number in each title is the latest value. Since the chart without duplicates starts, game code counts every function in the target maps, not only the ones the objdiff report covers, and typed data leaves out byte arrays still named by their address; earlier points use the old counts.",
  empty: "starts with the next published run",
  charts: {
    gameFunctions: "Game functions rebuilt in C over time",
    gameBytes: "Game code bytes rebuilt in C over time",
    gameUnique: "Game functions without duplicates over time",
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
  targetLabel: "Image",
  allTargets: "Every image",
  scopeLabel: "Part",
  scopes: { all: "Everything", game: "Game code", sdk: "PsyQ SDK", hand: "Hand-written assembly" },
  libraryLabel: "Library",
  allLibraries: "Every library",
  sortLabel: "Sort by",
  sorts: { address: "Address", size: "Size", name: "Name", status: "Status" },
  columns: { function: "Function", target: "Image", address: "Address", status: "Status", bytes: "Size" },
  reset: "Clear filters",
  none: "No function matches. Try a shorter search.",
  limited: (shown: number, total: number) => `Showing the first ${number(shown)} of ${number(total)} functions. Type more to narrow it down.`,
  shown: (count: number) => `${plural(count, "function")} shown.`,
  scope: (listed: number, counted: number) =>
    `The list shows the ${number(listed)} game functions the objdiff report names; the counts above are bin/status's ${number(counted)}.`,
  more: (step: number) => `Show ${number(step)} more`,
  share: "Copy link to this view",
  copied: "Link copied",
};

export const INSPECT = {
  close: "Close",
  copyLink: "Copy link",
  copied: "Link copied",
  function: "Function",
  target: "Image",
  fields: {
    name: "Name",
    address: "Address",
    ends: "Ends at",
    size: "Size",
    status: "Status",
    part: "Part",
    target: "Image",
    group: "Part of the game",
    source: "Source file",
    library: "Library",
    tier: "Kind",
    version: "PsyQ version",
    score: "Fuzzy match",
    previous: "Previous function",
    next: "Next function",
    functions: "Functions",
    bytes: "Code size",
    data: "Data typed in C",
    payload: "Image size",
    targets: "Images",
  },
  parts: { game: "Game code", sdk: "PsyQ SDK", hand: "Hand-written assembly" },
  noSource: "No C file: this function is still the original assembly.",
  sourceNote: "The file name follows the project's naming rule, and the link points at the commit this page was measured at.",
  objectNote: "The unit was sliced from this PsyQ object; the SDK is shown apart.",
  noSourceSdk: "Linked from the original PsyQ library, so there is no C file.",
  noSourceAssembly: "Kept as assembly: no PsyQ object reproduces it and there is no C file.",
  showOnMap: "Show on the map",
  browseTarget: "Browse its functions",
  functions: (done: number, total: number, percent: string) => `${number(done)} of ${number(total)} rebuilt in C (${percent}%)`,
  notFound: "That function is not in the data. It may have been renamed since this link was made.",
};

export const FOOT = {
  generated: "Everything here is generated from",
  doNotEdit: ", so please do not edit it by hand.",
};

// Picture only.
export const POSTER = {
  title: "Breath of Fire III decompilation status",
  subtitle: (commit: string, date: string) => `rebof3 ${commit} · ${date}`,
  libraries: "PsyQ libraries and versions",
  libraryKey: (objects: number, assembly: number) => `${number(objects)} objects · ${number(assembly)} assembly`,
  libraryLinked: "kept as assembly",
  sdkTitle: (percent: string, done: number, total: number) => `PsyQ SDK: ${percent}% objects (${number(done)}/${number(total)})`,
  badge: "C match",
};
