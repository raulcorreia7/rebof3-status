// The data files' types, derived from their schemas (model/schema.ts), and the model built from
// them (model/report.ts).

import type * as z from "zod/mini";
import type { AssetCensusSchema, HistorySchema, ReportSchema, StatusCensusSchema, StatusDataSchema } from "./model/schema.ts";

export type Status = "pure" | "nonmatching" | "open" | "object" | "assembly" | "asm";
export type Tier = "object" | "assembly";
/** The three progress categories: game code, the PsyQ SDK and hand-written assembly. */
export type Part = "game" | "sdk" | "hand";

export type Report = z.output<typeof ReportSchema>;
export type ReportUnit = Report["units"][number];
export type StatusData = z.output<typeof StatusDataSchema>;
export type StatusCensus = z.output<typeof StatusCensusSchema>;
export type StatusCensusTarget = NonNullable<StatusCensus["targets"]>[number];
export type AssetCensus = z.output<typeof AssetCensusSchema>;
export type AssetKindRow = AssetCensus["kinds"][number];
export type History = z.output<typeof HistorySchema>;
export type HistoryRow = History["rows"][number];

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
  /** Bytes that build to the original. */
  matched: number;
  /** objdiff's fuzzy match of the unit, 0-100. */
  fuzzy: number;
  status: Status;
  kind: Part;
  /** Lower-case text the search matches. */
  key: string;
  /** The C source or PsyQ object the unit was built from, when the report names one. */
  source: string | null;
  library?: string;
  tier?: Tier;
  version?: string | null;
  score?: number | null;
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

/** Game functions of a target or group as bin/status counts them: the headline's units. */
export interface Code {
  functions: number;
  exact: number;
  /** Functions with a NON_MATCHING draft in C. */
  draft: number;
  bytes: number;
  exactBytes: number;
}

export interface Target {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  /** Payload bytes. */
  size: number;
  data: { bytes: number; typed: number } | null;
  /** Game functions from bin/status; from the report when status.json lacks targets. */
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
  /** The sum of its targets' data, or null when none has data. */
  data: { bytes: number; typed: number } | null;
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

/** The three headline parts: game code, game data and assets. */
export interface Headline {
  game: {
    functions: number;
    exact: number;
    bytes: number;
    exactBytes: number;
    /** Each repeated function body once; null when status.json is not published. */
    unique: { functions: number; exact: number; bytes: number; exactBytes: number } | null;
  };
  data: { bytes: number; typed: number; rawC: number | null; apart: { reserved: number; copied: number; sdk: number; asset: number } | null } | null;
  assets: { bytes: number; extracted: number; decoded: number; roundTrip: number; kinds: AssetKindRow[] } | null;
}

export interface Model {
  meta: { version: number; generatedAt: string; date: string; commit: string; shortCommit: string };
  /** The headline numbers. Game code comes from status.json when it is published, else the report. */
  headline: Headline;
  /** Game code by bin/status, the sum of every target's code: what the map and the groups show. */
  code: Code;
  /** Game code in the report: the functions the browser lists, and the fuzzy match. */
  game: Tally;
  /** PsyQ units, shown apart. */
  sdk: Tally;
  /** Hand-written assembly units, shown apart. */
  hand: Tally;
  /** Every unit, for the map legend. */
  all: Tally;
  data: { bytes: number; typed: number } | null;
  quality: Quality;
  groups: Group[];
  targets: Target[];
  targetById: Map<string, Target>;
  functions: Fn[];
  functionById: Map<string, Fn>;
  libraries: Library[];
  history: HistoryRow[];
}
