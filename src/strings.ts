// Every sentence and label the page and the picture show. Change wording here and nowhere else.
// One name per thing: a status, a part of the game, an image and a measure keep the same words in
// every card, key, list and tooltip.

import type { Quality, Status } from "./types.ts";
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
  repoUrl: "https://github.com/raulcorreia7/rebof3-simple",
  loadFailed: (message: string) => `The status data could not be loaded (${message}).`,
  loadFailedReload: "Reload the page",
  loadFailedOpen: " or open ",
  loadFailedEnd: " directly.",
};

export const HEAD = {
  title: "Breath of Fire III decompilation",
  skip: "Skip to the content",
  sections: "Sections",
  updated: "Updated",
  from: "from rebof3",
  getThe: "Get the",
  data: "report",
  or: "or the",
  picture: "full picture",
  theme: { auto: "Theme: automatic", light: "Theme: light", dark: "Theme: dark" },
};

/** Shown for a figure the published data does not measure yet. */
const PENDING = ["from next run", "measured by the next published run"];

export const SUMMARY = {
  overviewHeading: "Overview",
  gameHeading: "Game code",
  gameHelp: "Every function of the game's programs and overlays. A function counts as rebuilt when its C builds to the exact original bytes.",
  gameFunctions: "Game functions",
  gameBytes: "Game code by size",
  unique: "Unique game functions",
  of: (done: number, total: number) => `${number(done)} of ${number(total)} rebuilt in C`,
  ofBytes: (done: number, total: number) => `${bytesOf(done, total)} rebuilt in C`,
  fuzzy: "Fuzzy match",
  fuzzyNote: "how close the game code is to the original, by size",
  footnote: "Many overlays carry copies of the same function. Unique game functions counts each one once, as rebuilt when any copy is.",
  pending: PENDING,
  dataHeading: "Game data",
  dataHelp: "The data bytes of the game's programs and overlays: tables, text and records. A byte counts as typed when C defines it with a real type.",
  data: "Game data",
  dataOf: (typed: number, total: number) => `${bytesOf(typed, total)} typed in C`,
  dataRaw: "Game data as raw bytes",
  dataRawOf: (raw: number, total: number) => `${bytesOf(raw, total)} in C, still byte arrays named by their address`,
  dataApart: (reserved: number, copied: number, sdk: number, asset: number) =>
    `Left out of the total, as not data to type: ${bytes(reserved)} reserved (work areas that are zero on the disc and filled while the game runs), ` +
    `${bytes(copied)} copied from another program, ${bytes(sdk)} of PsyQ library data and ${bytes(asset)} of assets kept as the original files.`,
  assetsHeading: "Assets",
  assetsHelp:
    "The other files on the disc: pictures, sound, music, video, models, maps and tables. The game loads them from the original disc files, so they are not part of the decompilation and never count in the figures above. Converted means the asset tools turn a file into a standard format anyone can open: pictures to PNG, sound to WAV, music to MIDI, models to OBJ or glTF, tables and text to JSON.",
  assets: "Assets",
  assetsOf: (done: number, total: number) => `${bytesOf(done, total)} converted to standard files`,
  assetsExtracted: "Assets extracted",
  assetsExtractedOf: (done: number, total: number) => `${bytesOf(done, total)} extracted from the disc`,
  assetsRoundTrip: "Assets that convert back exactly",
  assetsRoundTripOf: (done: number, total: number) => `${bytesOf(done, total)} convert to a standard file and back to the original bytes`,
  assetKinds: "Assets by kind",
  assetKindsHelp: "One bar per kind of file, as long as its size on the disc.",
  assetHandling: { decoded: "converted", raw: "extracted as stored", none: "not extracted" } as Record<string, string>,
};

export const MAP = {
  heading: "Parts of the game",
  help: "One block per part of the game, then one bar or tile per image, biggest first. Open a part or an image to see its functions.",
  statusHelp: "Draft in C: C that builds but does not match the original yet. Not started: still the original assembly.",
  key: (functions: number, size: number | null) => (size === null ? plural(functions, "function") : `${plural(functions, "function")} · ${bytes(size)}`),
  group: (done: number, total: number, size: number, images: number) => `${number(done)} of ${plural(total, "function")} · ${bytes(size)} · ${plural(images, "image")}`,
  image: (done: number, total: number) => `${number(done)} of ${number(total)}`,
  imageLine: (done: number, total: number, size: number) => `${number(done)} of ${plural(total, "function")} · ${bytes(size)}`,
  imageAria: (name: string, done: number, draft: number, total: number, size: number) =>
    `${name}: ${number(done)} of ${plural(total, "function")} rebuilt in C, ${number(draft)} draft, ${bytes(size)}`,
  crumbs: "Breadcrumb",
  facts: { size: "Image size", data: "Data typed in C", source: "Source" },
  chartLabel: (title: string, functions: number) => `${title}: treemap of ${plural(functions, "function")}`,
  listHeading: (count: number) => `Functions (${number(count)})`,
  listEmpty: "The report lists no functions here yet.",
  showMore: (count: number) => `Show ${number(count)} more`,
  coverage: (listed: number, listedBytes: number, counted: number, countedBytes: number) =>
    `The treemap shows the ${plural(listed, "function")} the report lists (${bytes(listedBytes)}); the counts above have ${number(counted)} (${bytes(countedBytes)}).`,
  partMissing: "This part of the game is not in the data.",
  imageMissing: "This image is not in the data. It may have been renamed since this link was made.",
};

export const SDK = {
  heading: "PsyQ SDK",
  sdkLabel: "PsyQ SDK:",
  sdkText: (done: number, total: number, assembly: number) =>
    `${number(done)} of ${number(total)} units link from original PsyQ library objects` + (assembly ? `; ${number(assembly)} are assembly only.` : "."),
  handLabel: "Hand-written assembly:",
  handText: (done: number, total: number) => `${number(done)} of ${number(total)} units match exactly. Neither counts in the game code figures.`,
  librariesHeading: "Libraries",
  help: "One bar per library. Open a library to list its functions.",
  versions: (text: string) => `from PsyQ ${text}`,
  assemblyOnly: (count: number) => `${number(count)} assembly only`,
  done: (objects: number, total: number) => `${number(objects)} of ${number(total)}`,
  assemblyLibrary: "assembly only",
};

export const DATA = {
  partsHeading: "By part of the game",
  help: "Byte arrays still named by their address do not count as typed. Each image is capped at its data bytes, so no bar passes 100%.",
  typed: "typed in C",
  untyped: "not typed yet",
};

export const QUALITY = {
  heading: "Match quality",
  perTargetHeading: "Drafts in C by part of the game",
  perTargetHelp: "Game functions in C that do not build to the original bytes yet.",
  verifyHeading: "How the numbers are counted",
  gameScope: "Game code:",
  gameScopeText: (done: number, total: number, doneBytes: number, totalBytes: number) =>
    `${number(done)} of ${number(total)} functions are rebuilt in C (${bytesOf(doneBytes, totalBytes)}), counted over the link map of every image. The PsyQ SDK and the hand-written assembly are not counted.`,
  dataScope: "Game data:",
  dataScopeText: (typed: number | null, total: number | null, rawC: number | null) =>
    typed === null || total === null
      ? "not measured in this run."
      : `${bytesOf(typed, total)} of data is typed in C.` + (rawC ? ` Another ${bytes(rawC)} is in C as byte arrays still named by their address, and does not count.` : ""),
  assetScope: "Assets:",
  assetScopeText: (decoded: number | null, total: number | null) =>
    decoded === null || total === null
      ? "not measured in this run."
      : `${bytesOf(decoded, total)} of the disc files that are not program code convert to standard files (PNG, WAV, MIDI, OBJ, JSON). Assets never count as decompilation.`,
  table: "Every image",
  columns: { image: "Image", functions: "Functions", rebuilt: "Rebuilt in C", drafts: "Drafts in C", size: "Size", fuzzy: "Fuzzy match", data: "Data typed in C" },
};

export const TREND = {
  heading: "Progress over time",
  help: "One point per day; each title ends with the latest value. Earlier points use older counts: game code counted only the functions in the report, and typed data included byte arrays named by their address.",
  empty: "starts with the next published run",
  charts: {
    gameFunctions: "Game functions",
    gameBytes: "Game code by size",
    gameUnique: "Unique game functions",
    sdk: "PsyQ SDK library objects",
    data: "Game data typed in C",
    assets: "Assets converted",
    benign: "Benign helper macros",
    harmful: "Harmful helper macros",
    fieldRef: "Raw offset accesses",
    localExterns: "Declarations inside .c files",
  },
};

export const BROWSER = {
  heading: "Functions",
  searchPlaceholder: "Name, address or status",
  searchLabel: "Search functions",
  statusLabel: "Status",
  targetLabel: "Image",
  allTargets: "All images",
  scopeLabel: "Code",
  scopes: { all: "All code", game: "Game code", sdk: "PsyQ SDK", hand: "Hand-written assembly" },
  libraryLabel: "Library",
  allLibraries: "All libraries",
  sortLabel: "Sort by",
  sorts: { address: "Address", size: "Size", name: "Name", status: "Status" },
  columns: { function: "Function", status: "Status", size: "Size", target: "Image", address: "Address" },
  reset: "Clear filters",
  none: "No function matches. Try fewer words.",
  limited: (shown: number, total: number) => `Showing ${number(shown)} of ${plural(total, "function")}.`,
  shown: (count: number) => `${plural(count, "function")}.`,
  scope: (listed: number, counted: number) => `The list has the ${number(listed)} game functions the report names; the counts above have ${number(counted)}.`,
  more: (step: number) => `Show ${number(step)} more`,
  share: "Copy link",
  copied: "Link copied",
};

export const INSPECT = {
  kind: "Function",
  close: "Close",
  copyLink: "Copy link",
  copied: "Link copied",
  fields: {
    address: "Address",
    ends: "Ends at",
    size: "Size",
    status: "Status",
    fuzzy: "Fuzzy match",
    code: "Code",
    library: "Library",
    version: "PsyQ version",
    image: "Image",
    group: "Part of the game",
    source: "Source file",
    previous: "Previous function",
    next: "Next function",
  },
  code: { game: "Game code", sdk: "PsyQ SDK", hand: "Hand-written assembly" },
  noSource: "None yet: this function is still the original assembly.",
  noSourceSdk: "None: it links from the original PsyQ library.",
  noSourceAssembly: "None: it is kept as assembly.",
  notFound: "This function is not in the data. It may have been renamed since this link was made.",
};

export const FOOT = {
  text: "Generated by the rebof3 build at the commit above; the report and the picture hold the same numbers.",
};

// Picture only.
export const POSTER = {
  title: "Breath of Fire III decompilation status",
  subtitle: (commit: string, date: string) => `rebof3 ${commit} · ${date}`,
  statusHeading: "Status of game code",
  dataHeading: (percent: string, typed: number, total: number) => `Game data: ${percent}% typed in C (${bytesOf(typed, total)})`,
  libraries: "PsyQ libraries and versions",
  libraryKey: (objects: number, assembly: number) => `${number(objects)} PsyQ library objects · ${number(assembly)} assembly only`,
  libraryLinked: "assembly only",
  sdkTitle: (percent: string, done: number, total: number) => `PsyQ SDK: ${percent}% library objects (${number(done)} of ${number(total)})`,
  qualityHeading: "Match quality",
  qualityCards: (q: Quality): [string, string, string][] => [
    ["Rebuilt in C", number(q.exact), "game functions, byte for byte"],
    ["Drafts in C", number(q.inProgress), "game functions that do not match yet"],
    ["Not started", number(q.notStarted), "game functions still the original assembly"],
    ["Fuzzy match", `${q.fuzzy.toFixed(1)}%`, "how close the game code is, by size"],
    ["Hand-written assembly", `${number(q.handDone)} of ${number(q.hand)}`, "units that match exactly"],
  ],
  badge: "C match",
};
