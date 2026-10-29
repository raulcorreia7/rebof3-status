// Every sentence and label the page and the picture show. Change wording here and nowhere else.
// One name per thing: a status, a part of the game, an image and a measure keep the same words in
// every card, key, list and tooltip.

import { bytes, bytesOf, number, plural } from "./model/format.ts";
import type { Quality, Status } from "./types.ts";

// Status key -> legend text. The order of the keys is the order of the legend.
export const STATUS_LABEL: Record<Status, string> = {
  pure: "rebuilt in C",
  nonmatching: "draft in C",
  open: "not started",
  object: "SDK, linked from PsyQ objects",
  asm: "hand-written assembly",
  assembly: "SDK, split assembly",
};

// Group key -> heading and note (model/groups.ts names the groups).
export const GROUP_LABEL: Record<string, string> = {
  main: "SLUS_004.22",
  logo: "LOGO.EXE",
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
  main: "The game’s main executable.",
  logo: "The start-up screen.",
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
  overviewHeading: "How far along?",
  gameHeading: "Game code",
  gameFunctions: "Game functions",
  gameBytes: "Game code by size",
  byFunctions: "By functions",
  byBytes: "By code bytes",
  of: (done: number, total: number) => `${number(done)} of ${number(total)} rebuilt in C`,
  ofBytes: (done: number, total: number) => `${bytesOf(done, total)} rebuilt in C`,
  fuzzy: "Fuzzy match",
  fuzzyNote: "how close the game code is to the original, by size",
};

export const MAP = {
  heading: "Parts of the game",
  help: "Select a part or image to explore its functions.",
  detailsHeading: "Explore the parts",
  shading: "Block size: code bytes · Shade: percentage rebuilt in C by code size",
  homeChartLabel: "Treemap of game parts and images, with linked PsyQ SDK code",
  key: (
    functions: number,
    size: number | null,
  ) => (size === null
    ? plural(functions, "function")
    : `${plural(functions, "function")} · ${bytes(size)}`),
  group: (done: number, total: number, size: number, images: number) =>
    `${number(done)} of ${plural(total, "function")} · ${bytes(size)} · ${plural(images, "image")}`,
  image: (done: number, total: number) => `${number(done)} of ${number(total)}`,
  imageLine: (done: number, total: number, size: number) =>
    `${number(done)} of ${plural(total, "function")} · ${bytes(size)}`,
  imageAria: (name: string, done: number, draft: number, total: number, size: number) =>
    `${name}: ${number(done)} of ${plural(total, "function")} rebuilt in C, ${
      number(draft)
    } draft, ${bytes(size)}`,
  crumbs: "Breadcrumb",
  chartLabel: (title: string, functions: number) =>
    `${title}: treemap of ${plural(functions, "function")}`,
  listHeading: (count: number) => `Functions (${number(count)})`,
  listEmpty: "The report lists no functions here yet.",
  showMore: (count: number) => `Show ${number(count)} more`,
  partMissing: "This part of the game is not in the data.",
  imageMissing: "This image is not in the data. It may have been renamed since this link was made.",
};

export const SDK = {
  heading: "PsyQ SDK",
  sdkText: (
    linked: { units: number; bytes: number },
    split: { units: number; bytes: number },
    version: string,
  ) =>
    `Linked from PsyQ ${version} objects: ${plural(linked.units, "unit")}, ${
      bytes(linked.bytes)
    }. SDK, split assembly: ${plural(split.units, "unit")}, ${bytes(split.bytes)}. `
    + "This is not game work: it is left out of every game code figure.",
  totalText: (game: number, sdk: number, hand: number) =>
    `Image size: ${bytes(game)} of game code, ${bytes(sdk)} of SDK code and ${
      bytes(hand)
    } of hand-written assembly make ${bytes(game + sdk + hand)} in all.`,
  group: "PsyQ SDK (linked)",
  legend: (version: string) => `SDK: linked from PsyQ ${version} objects, not decompiled`,
  legendSub: (units: number, size: number) => `${plural(units, "unit")} · ${bytes(size)}`,
  splitTip: "SDK, split assembly",
  libraryTip: (units: number, size: number) => `${plural(units, "member")} · ${bytes(size)}`,
  handLabel: "Hand-written assembly:",
  handText: (done: number, total: number) =>
    `${number(done)} of ${
      number(total)
    } functions match exactly. Neither counts in the game code figures.`,
  versions: (text: string) => `from PsyQ ${text}`,
  assemblyOnly: (count: number) => `${number(count)} split assembly`,
  done: (objects: number, total: number) => `${number(objects)} of ${number(total)}`,
  assemblyLibrary: "split assembly",
};

export const BROWSER = {
  heading: "Find a function",
  hint: "Searches game functions by name, address or status.",
  searchPlaceholder: "Name, address or status",
  searchLabel: "Search game functions",
  columns: {
    function: "Function",
    status: "Status",
    size: "Size",
    target: "Image",
    address: "Address",
  },
  none: "No function matches. Try fewer words.",
  limited: (shown: number, total: number) =>
    `Showing ${number(shown)} of ${plural(total, "function")}.`,
  shown: (count: number) => `${plural(count, "function")}.`,
  more: (step: number) => `Show ${number(step)} more`,
  share: "Copy link",
  copied: "Link copied",
};

export const INSPECT = {
  kind: "File",
  close: "Close",
  copyLink: "Copy link",
  copied: "Link copied",
  match: (matched: number, total: number) => `${number(matched)} of ${number(total)} match`,
  fields: {
    address: "Address",
    ends: "Ends at",
    size: "Size",
    status: "Status",
    functions: "Functions",
    fuzzy: "Fuzzy match",
    code: "Code",
    library: "Library",
    member: "Member object",
    version: "PsyQ version",
    image: "Image",
    group: "Part of the game",
    source: "Source file",
    previous: "Previous file",
    next: "Next file",
  },
  code: { game: "Game code", sdk: "PsyQ SDK", hand: "Hand-written assembly" },
  noSource: "None yet: this function is still the original assembly.",
  noSourceSdk: "None: it links from the original PsyQ library.",
  noSourceAssembly: "None: it is split assembly of the original PsyQ code.",
  notFound: "This file is not in the data. It may have been renamed since this link was made.",
};

export const FOOT = {
  text: "Generated from the objdiff report; the page and the picture hold the same numbers.",
  linksLabel: "Project links",
  links: [
    { href: "https://github.com/raulcorreia7/rebof3-status", label: "This site's source" },
    { href: "https://github.com/raulcorreia7/bof3player", label: "Audio player and disc tools" },
  ],
  notice:
    "A fan project, not affiliated with or endorsed by Capcom. Breath of Fire is a Capcom trademark. No game data is included.",
};

// Picture only.
export const POSTER = {
  title: "Breath of Fire III decompilation status",
  subtitle: "from the objdiff report",
  statusHeading: "Status of game code",
  libraries: "PsyQ libraries and versions",
  libraryKey: (objects: number, assembly: number) =>
    `${number(objects)} linked from PsyQ objects · ${number(assembly)} split assembly`,
  libraryLinked: "linked",
  sdkTitle: (percent: string, done: number, total: number) =>
    `PsyQ SDK: ${percent}% library objects (${number(done)} of ${number(total)})`,
  qualityHeading: "Match quality",
  qualityCards: (q: Quality): [string, string, string][] => [
    ["Rebuilt in C", number(q.exact), "game functions, byte for byte"],
    ["Drafts in C", number(q.inProgress), "game functions that do not match yet"],
    ["Not started", number(q.notStarted), "game functions still the original assembly"],
    ["Fuzzy match", `${q.fuzzy.toFixed(1)}%`, "how close the game code is, by size"],
    [
      "Hand-written",
      `${number(q.handDone)} of ${number(q.hand)}`,
      "assembly units that match exactly",
    ],
  ],
  badge: "C match",
};
