// The shape of objdiff-cli's report.json (version 2), the data census in
// status-data.json, the game code census in status.json, the asset census in assets.json, the
// committed history file, and the model built from them (model/report.ts).

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
    /** Bytes in C as byte arrays still named by address: not typed. Absent from older publishes. */
    raw_c?: number;
    /** Payload bytes left out of data_payload: zero-filled reservations, image copies, PsyQ and asset spans. */
    reserved?: number;
    copied?: number;
    sdk?: number;
    asset?: number;
    percent: number;
  };
}

/** bin/status --json: the game code census of every target map. Only the headline is read. */
export interface StatusCensus {
  game_code: {
    functions: number;
    exact: number;
    bytes: number;
    exact_bytes: number;
    unique_functions: number;
    unique_exact: number;
    unique_bytes: number;
    unique_exact_bytes: number;
  };
}

/** One disc asset kind as the asset tool handles it. */
export interface AssetKindRow {
  kind: string;
  entries: number;
  bytes: number;
  /** `decoded` to an open format, `raw` (the stored bytes) or `none` (not extracted). */
  handling: string;
  /** Bytes that export and import back to themselves. */
  round_trip_bytes: number;
}

/** assets.json: the disc assets by kind, program code left out. Written by the publisher. */
export interface AssetCensus {
  kinds: AssetKindRow[];
  totals: { entries: number; bytes: number; extracted_bytes: number; decoded_bytes: number; round_trip_bytes: number };
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
  /** Game code in the report: the functions the map, the groups and the browser show. */
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
