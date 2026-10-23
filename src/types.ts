// The shape of objdiff-cli's report.json (version 2), the data census in
// status-data.json, the committed history file, and the model built from them
// (model/report.ts).

export type Status = "pure" | "nonmatching" | "open" | "object" | "assembly" | "asm";
export type Tier = "object" | "assembly";
/** The three progress categories: game code, the PsyQ SDK and hand-written assembly. */
export type Part = "game" | "sdk" | "hand";

/** One objdiff measure. Byte counts arrive as strings, shares as numbers. */
export interface Measures {
  fuzzy_match_percent?: number;
  total_code?: string | number;
  matched_code?: string | number;
  total_functions?: number;
  matched_functions?: number;
}

export interface ReportCategory {
  id: string;
  name: string;
  measures: Measures;
}

export interface ReportUnit {
  name: string;
  measures: Measures;
  metadata: {
    complete?: boolean;
    source_path?: string;
    progress_categories?: string[];
  };
}

/** objdiff-cli report generate, version 2. */
export interface Report {
  version?: number;
  measures?: Measures;
  categories: ReportCategory[];
  units: ReportUnit[];
}

export interface StatusDataTarget {
  target: string;
  payload: number;
  code: number;
  data_payload: number;
  typed: number;
  percent: number;
}

/** bin/status --data --json: the typed and named data census. */
export interface StatusData {
  targets: StatusDataTarget[];
  totals: {
    payload: number;
    code: number;
    data_payload: number;
    typed: number;
    percent: number;
  };
}

/** One history row; a share is null for days the project did not measure it. */
export type HistoryRow = { date: string; revision: string; source: string } & Record<string, number | string | null>;

/** The committed history and the identity of the report it ends with. */
export interface History {
  commit: string;
  generated_at: string;
  rows: HistoryRow[];
}

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

export interface Target {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  /** Payload bytes. */
  size: number;
  data: { bytes: number; typed: number } | null;
  functions: Fn[];
  /** Game functions only. */
  game: Tally;
  /** Every unit in the target: game, PsyQ and hand-written assembly. */
  all: Tally;
}

export interface Group extends Tally {
  key: string;
  label: string;
  note: string;
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

export interface Model {
  meta: { version: number; generatedAt: string; date: string; commit: string; shortCommit: string };
  /** Game code sums, the only functions the headline counts. */
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
