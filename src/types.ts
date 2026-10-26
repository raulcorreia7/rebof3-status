// The data file's type, derived from its schema (model/schema.ts), and the model built from it
// (model/report.ts).

import type * as z from "zod/mini";
import type { ReportSchema } from "./model/schema.ts";

export type Status = "pure" | "nonmatching" | "open" | "object" | "assembly" | "asm";
export type Tier = "object" | "assembly";
/** The three progress categories: game code, the PsyQ SDK and hand-written assembly. */
export type Part = "game" | "sdk" | "hand";

export type Report = z.output<typeof ReportSchema>;

// Model ------------------------------------------------------------------------------------

/** One function: the unit the page counts, draws and lists. */
export interface Fn {
  /** Unique in the model: the unit and the function name. */
  id: string;
  /** The report unit (source file) the function belongs to; the inspector opens it. */
  unit: string;
  target: string;
  /** `0x` absolute address from the function name, or "" when the name carries none. */
  addr: string;
  address: number | null;
  /** Offset inside the unit, from the report. */
  offset: number;
  name: string;
  bytes: number;
  /** objdiff's fuzzy match of the function, 0-100. A function is matched at 100. */
  fuzzy: number;
  /** Whether the report contains a fuzzy-match measurement for this function. */
  fuzzyReported: boolean;
  status: Status;
  kind: Part;
  /** Lower-case text the search matches. */
  key: string;
  library?: string;
  tier?: Tier;
  version?: string | null;
}

/** One report unit: a source file, the level the inspector shows. */
export interface Unit {
  /** The objdiff unit name, unique: the source file. */
  id: string;
  target: string;
  /** The file's label: its source path for game and hand code, its symbol for the SDK. */
  name: string;
  source: string | null;
  kind: Part;
  /** `0x` absolute address when the unit or one of its functions names one. */
  addr: string;
  address: number | null;
  /** Sum of the function sizes: the file's code bytes. */
  bytes: number;
  /** Functions with a fuzzy match of 100. */
  matched: number;
  matchedBytes: number;
  /** Code-byte weighted fuzzy match of the file, 0-100. */
  fuzzy: number;
  fuzzyReported: boolean;
  /** What the file as a whole shows: all functions matched, some, or none. */
  status: Status;
  functions: Fn[];
  library?: string;
  tier?: Tier;
  version?: string | null;
}

export interface Tally {
  /** Number of functions. */
  count: number;
  bytes: number;
  done: number;
  doneBytes: number;
  statuses: Record<Status, { functions: number; bytes: number }>;
  percent: number;
  /** Code bytes weighted fuzzy match, 0-100. */
  fuzzy: number;
}

/** Game functions of a target or group, from the report's functions: the map's counts. */
export interface Code {
  functions: number;
  exact: number;
  /** Functions with a draft in C that does not match yet. */
  draft: number;
  bytes: number;
  exactBytes: number;
}

export interface Target {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  /** Game functions in this target: the report's functions. */
  code: Code;
  /** Every function in the target: game, PsyQ and hand-written assembly. */
  functions: Fn[];
  /** The report units (source files) in the target. */
  units: Unit[];
  /** Game functions in the report only. */
  game: Tally;
  /** Every function in the target: game, PsyQ and hand-written assembly. */
  all: Tally;
}

export interface Group extends Tally {
  key: string;
  label: string;
  note: string;
  /** Draw the targets as a grid of small tiles instead of one row each. */
  tiles: boolean;
  /** The sum of its targets' code. */
  code: Code;
  targets: Target[];
}

export interface Library extends Tally {
  name: string;
  versions: Record<string, number>;
  tiers: Record<Tier, number>;
  functions: Fn[];
}

export interface Quality {
  /** Game functions rebuilt exactly. */
  exact: number;
  /** Game functions with a draft that does not build to the original yet. */
  inProgress: number;
  /** Game functions still the original assembly. */
  notStarted: number;
  /** Hand-written assembly units. */
  hand: number;
  handDone: number;
  /** Game code bytes weighted fuzzy match. */
  fuzzy: number;
}

/** The headline: the game code the report measures. */
export interface Headline {
  game: {
    functions: number;
    exact: number;
    bytes: number;
    exactBytes: number;
  };
}

export interface Model {
  meta: { version: number };
  /** The headline numbers: the game code the report measures. */
  headline: Headline;
  /** Game code from the report, the sum of every target's code: what the map and the groups show. */
  code: Code;
  /** Game functions in the report: the functions the browser lists, and the fuzzy match. */
  game: Tally;
  /** PsyQ functions, shown apart. */
  sdk: Tally;
  /** Hand-written assembly functions, shown apart. */
  hand: Tally;
  /** Every function, for the map legend. */
  all: Tally;
  quality: Quality;
  groups: Group[];
  targets: Target[];
  targetById: Map<string, Target>;
  units: Unit[];
  unitById: Map<string, Unit>;
  functions: Fn[];
  libraries: Library[];
}
