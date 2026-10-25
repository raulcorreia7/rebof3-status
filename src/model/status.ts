// The status table: the one place that says what a function status is. The legend, the filters,
// the charts, the picture and the totals all read it. To add a status, add a row here, its label
// in strings.ts (STATUS_LABEL) and its colours in theme/tokens.ts; nothing else changes.
// A status says what the report proves: a finished game function, a draft, original assembly, a
// PsyQ object, or an assembly-only unit.

import { STATUS_LABEL } from "../strings.ts";
import type { Code, Fn, Status, Tier } from "../types.ts";

export type Phase = "done" | "in-progress" | "open";

interface StatusRow {
  key: Status;
  /** Legend text, from strings.ts. */
  label: string;
  /** CSS colour reference, defined per theme by theme/tokens.ts. */
  color: string;
  /** Class name for the state of the work. */
  phase: Phase;
  /** The parts of the code where this status counts as done. */
  doneIn: readonly Fn["kind"][];
}

/** The CSS custom property of a status (`nonmatching` -> `--st-nonmatching`). */
export const statusProp = (key: string): string => `--st-${key.replaceAll("_", "-")}`;
export const statusVar = (key: string): string => `var(${statusProp(key)})`;

const row = (key: Status, phase: Phase, doneIn: readonly Fn["kind"][]): StatusRow => ({
  key,
  label: STATUS_LABEL[key],
  color: statusVar(key),
  phase,
  doneIn,
});

/** All statuses in tile order. */
export const STATUS_TABLE: readonly StatusRow[] = [
  row("pure", "done", ["game"]),
  row("nonmatching", "in-progress", []),
  row("open", "open", []),
  row("object", "done", ["sdk"]),
  row("asm", "done", ["hand"]),
  row("assembly", "open", []),
];

export const STATUS = Object.fromEntries(STATUS_TABLE.map((entry) => [entry.key, entry])) as Record<Status, StatusRow>;
export const STATUSES: readonly Status[] = STATUS_TABLE.map((entry) => entry.key);
/** PsyQ unit kinds, best first. */
export const TIERS: readonly Tier[] = ["object", "assembly"];

export const isStatus = (value: string): value is Status => Object.hasOwn(STATUS, value);
/** Game functions rebuilt, draft and not started, as bin/status counts them; statuses with none are left out. */
export const codeCounts = (code: Code): [Status, number][] =>
  ([["pure", code.exact], ["nonmatching", code.draft], ["open", code.functions - code.exact - code.draft]] as [Status, number][]).filter(([, count]) => count);

/** A unit is done when it builds to the original bytes: game C, a PsyQ object or exact hand assembly. */
export const isDone = (fn: Pick<Fn, "kind" | "status">): boolean => STATUS[fn.status].doneIn.includes(fn.kind);
