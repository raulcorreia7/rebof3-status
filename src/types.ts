// The shape of progress.json (schema 2, written by tools/bof3/progress/document.py in rebof3)
// and of the model built from it (model/index.ts).

export type Status = "pure" | "fake_match" | "asm" | "object" | "assembly" | "nonmatching" | "open";
export type DataStatus = "typed" | "raw" | "header";
export type Tier = "c" | "object" | "partial" | "assembly" | "unmatched";
export type UnitKind = "f" | "s" | "d";

/** One Splat map row: [offset from the target base, size, kind, status, name]. */
export type Unit = [offset: number, size: number, kind: UnitKind, status: Status | DataStatus, name: string];

export interface StatusScope {
  functions: number;
  bytes: number;
  done_functions: number;
  done_bytes: number;
  statuses: Record<Status, [functions: number, bytes: number]>;
}

export interface Quality {
  fakes: number;
  harmful_fakes: number;
  benign_fakes: number;
  field_ref: number;
  local_externs: number;
  sym_conflicts: number;
  hand_asm: number;
}

export interface DataBytes {
  bytes: number;
  typed: number;
}

export interface LinkSummary {
  targets: number;
  exact: number;
  differs: number;
  error: number;
}

export interface LayoutSummary {
  rows: number;
  gaps: number;
  overlaps: number;
  relocated: number;
  unmodelled: number;
  resized: number;
  problems: number;
}

export interface TargetLink {
  status: "EXACT" | "DIFFERS" | "ERROR";
  payload: number;
  linked: number;
  from_c: number;
  from_assembly: number;
  first_mismatch: number | null;
}

export interface TargetLayout {
  gaps: unknown[];
  overlaps: unknown[];
  relocated: number;
  unmodelled: number;
  resized: number;
  problems: unknown[];
}

export interface RawTarget {
  id: string;
  name: string;
  base: string;
  end: string;
  counts: Record<string, number>;
  link: TargetLink | null;
  layout: TargetLayout;
  data: DataBytes | null;
  units: Unit[];
}

export interface RawLibrary {
  name: string;
  versions: Record<string, number>;
  tiers: Record<Tier, number>;
  functions: { target: string; addr: string; name: string; bytes: number; status: Status; tier: Tier; version: string | null; score: number | null }[];
}

/** One history row; a share is null for days the project did not measure it. */
export type HistoryRow = { date: string; revision: string; source: string } & Record<string, number | string | null>;

export interface ProgressData {
  schema: number;
  generated_at: string;
  commit: string;
  dirty: boolean;
  summary: {
    code: StatusScope;
    game: StatusScope;
    sdk: StatusScope;
    data: DataBytes | null;
    quality: Quality;
    links: LinkSummary | null;
    layout: LayoutSummary;
  };
  targets: RawTarget[];
  libraries: RawLibrary[];
  history: HistoryRow[];
}

// Model ------------------------------------------------------------------------------------

export interface Fn {
  /** `<target id>@<address>`, unique. */
  id: string;
  target: string;
  addr: string;
  address: number;
  name: string;
  bytes: number;
  status: Status;
  kind: "game" | "sdk";
  /** Lower-case text the search matches. */
  key: string;
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
}

export interface Target {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  base: number;
  end: number;
  size: number;
  counts: Record<string, number>;
  link: TargetLink | null;
  layout: TargetLayout;
  data: DataBytes | null;
  units: Unit[];
  functions: Fn[];
  /** Game functions only. */
  game: Tally;
  /** Game and PsyQ functions. */
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

export interface Model {
  meta: { schema: number; generatedAt: string; date: string; commit: string; shortCommit: string; dirty: boolean };
  summary: ProgressData["summary"];
  quality: Quality;
  links: LinkSummary | null;
  layout: LayoutSummary;
  data: DataBytes | null;
  /** Game and PsyQ functions. */
  all: Tally;
  game: Tally;
  sdk: Tally;
  groups: Group[];
  targets: Target[];
  targetById: Map<string, Target>;
  functions: Fn[];
  functionById: Map<string, Fn>;
  libraries: Library[];
  history: HistoryRow[];
}
