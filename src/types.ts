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

export interface Fn {
  /** The objdiff unit name, unique. */
  id: string;
  target: string;
  /** `0x` address from the unit name, or "" when the name carries none. */
  addr: string;
  address: number | null;
  name: string;
  bytes: number;
  /** objdiff's fuzzy match of the unit, 0-100. */
  fuzzy: number;
  /** Whether the report contains a fuzzy-match measurement for this unit. */
  fuzzyReported: boolean;
  status: Status;
  kind: Part;
  /** Lower-case text the search matches. */
  key: string;
  /** The C source or PsyQ object the unit was built from, when the report names one. */
  source: string | null;
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

/** Game functions of a target or group, from the report's units: the map's counts. */
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
  /** Game functions in this target: the report's units. */
  code: Code;
  functions: Fn[];
  /** Game functions in the report only. */
  game: Tally;
  /** Every unit in the target: game, PsyQ and hand-written assembly. */
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
  /** Game code in the report: the functions the browser lists, and the fuzzy match. */
  game: Tally;
  /** PsyQ units, shown apart. */
  sdk: Tally;
  /** Hand-written assembly units, shown apart. */
  hand: Tally;
  /** Every unit, for the map legend. */
  all: Tally;
  quality: Quality;
  groups: Group[];
  targets: Target[];
  targetById: Map<string, Target>;
  functions: Fn[];
  functionById: Map<string, Fn>;
  libraries: Library[];
}
