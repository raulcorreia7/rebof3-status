// The status table: the one place that says what a function status is. The legend, the filters,
// the charts, the picture and the totals all read it. To add a status, add a row here, its label
// in strings.ts (STATUS_LABEL) and its colours in theme/tokens.ts; nothing else changes.
// Statuses are those of progress.json (tools/bof3/progress/document.py in rebof3).

import { STATUS_LABEL } from "../strings.ts";
import type { Fn, Status, Tier } from "../types.ts";

export type Phase = "done" | "in-progress" | "open";

export interface StatusRow {
  key: Status;
  /** Legend text, from strings.ts. */
  label: string;
  /** CSS colour reference, defined per theme by theme/tokens.ts. */
  color: string;
  /** Class name for the state of the work. */
  phase: Phase;
  /** The parts of the code where this status counts as done. */
  doneIn: readonly Fn["kind"][];
  /** The function has a C file in the decompilation. */
  hasC: boolean;
}

/** The CSS custom property of a function or map-row status (`fake_match` -> `--st-fake-match`). */
export const statusProp = (key: string): string => `--st-${key.replace("_", "-")}`;
export const statusVar = (key: string): string => `var(${statusProp(key)})`;

const row = (key: Status, phase: Phase, doneIn: readonly Fn["kind"][], hasC: boolean): StatusRow => ({
  key,
  label: STATUS_LABEL[key],
  color: statusVar(key),
  phase,
  doneIn,
  hasC,
});

/** All statuses in tile order: finished work first. */
export const STATUS_TABLE: readonly StatusRow[] = [
  row("pure", "done", ["game", "sdk"], true),
  row("fake_match", "done", ["game"], true),
  row("asm", "done", ["game"], true),
  row("object", "done", ["sdk"], false),
  row("assembly", "open", [], false),
  row("nonmatching", "in-progress", [], true),
  row("open", "open", [], false),
];

export const STATUS = Object.fromEntries(STATUS_TABLE.map((entry) => [entry.key, entry])) as Record<Status, StatusRow>;
export const STATUSES: readonly Status[] = STATUS_TABLE.map((entry) => entry.key);
/** PsyQ match tiers, best first. */
export const TIERS: readonly Tier[] = ["c", "object", "partial", "assembly", "unmatched"];

export const isStatus = (value: string): value is Status => Object.hasOwn(STATUS, value);
/** A game function is done when it builds to the original bytes; an SDK function when it is exact C or links from an original object. */
export const isDone = (fn: Pick<Fn, "kind" | "status">): boolean => STATUS[fn.status].doneIn.includes(fn.kind);
