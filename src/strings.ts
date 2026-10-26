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
  loadFailed: (message: string) => `The status data could not be loaded (${message}).`,
  loadFailedReload: "Reload the page",
  loadFailedOpen: " or open ",
  loadFailedEnd: " directly.",
};

export const HEAD = {
  title: "Breath of Fire III decompilation",
  skip: "Skip to the content",
  sections: "Sections",
  getThe: "Get the",
  data: "report",
  or: "or the",
  picture: "full picture",
  theme: { auto: "Theme: automatic", light: "Theme: light", dark: "Theme: dark" },
};

export const SUMMARY = {
  overviewHeading: "Overview",
  gameHeading: "Game code",
  gameHelp: "Every function of the game's programs and overlays. A function counts as rebuilt when its C builds to the exact original bytes.",
  gameFunctions: "Game functions",
  gameBytes: "Game code by size",
  of: (done: number, total: number) => `${number(done)} of ${number(total)} rebuilt in C`,
  ofBytes: (done: number, total: number) => `${bytesOf(done, total)} rebuilt in C`,
  fuzzy: "Fuzzy match",
  fuzzyNote: "how close the game code is to the original, by size",
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
  chartLabel: (title: string, functions: number) => `${title}: treemap of ${plural(functions, "function")}`,
  listHeading: (count: number) => `Functions (${number(count)})`,
  listEmpty: "The report lists no functions here yet.",
  showMore: (count: number) => `Show ${number(count)} more`,
  partMissing: "This part of the game is not in the data.",
  imageMissing: "This image is not in the data. It may have been renamed since this link was made.",
};

export const SDK = {
  heading: "PsyQ SDK",
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

export const QUALITY = {
  heading: "Match quality",
  perTargetHeading: "Drafts in C by part of the game",
  perTargetHelp: "Game functions in C that do not build to the original bytes yet.",
  verifyHeading: "How the numbers are counted",
  gameScope: "Game code:",
  gameScopeText: (done: number, total: number, doneBytes: number, totalBytes: number) =>
    `${number(done)} of ${number(total)} functions are rebuilt in C (${bytesOf(doneBytes, totalBytes)}), counted from the objdiff report. The PsyQ SDK and the hand-written assembly are not counted.`,
  table: "Every image",
  columns: { image: "Image", functions: "Functions", rebuilt: "Rebuilt in C", drafts: "Drafts in C", size: "Size", fuzzy: "Fuzzy match" },
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
  text: "Generated from the objdiff report; the page and the picture hold the same numbers.",
};

// Picture only.
export const POSTER = {
  title: "Breath of Fire III decompilation status",
  subtitle: "from the objdiff report",
  statusHeading: "Status of game code",
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
    ["Hand-written", `${number(q.handDone)} of ${number(q.hand)}`, "assembly units that match exactly"],
  ],
  badge: "C match",
};
