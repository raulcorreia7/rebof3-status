// The status table: the one place that says what a function status is. The legend, the filters,
// the charts, the picture and the totals all read it. To add a status, add a row here, its label
// in strings.ts (STATUS_LABEL) and its colours in theme/tokens.ts; nothing else changes.
// A status says what the report proves: a finished game function, a draft, original assembly, a
// PsyQ object, or an assembly-only unit.

import { STATUS_LABEL } from "../strings.ts";
import type { Code, Fn, Status, Tier } from "../types.ts";

interface StatusRow {
  key: Status;
  /** Legend text, from strings.ts. */
  label: string;
  /** CSS colour reference, defined per theme by theme/tokens.ts. */
  color: string;
  /** The parts of the code where this status can count as done (a function also needs fuzzy 100). */
  doneIn: readonly Fn["kind"][];
}

/** The CSS custom property of a status (`nonmatching` -> `--st-nonmatching`). */
export const statusProp = (key: string): string => `--st-${key.replaceAll("_", "-")}`;
export const statusVar = (key: string): string => `var(${statusProp(key)})`;

const row = (key: Status, doneIn: readonly Fn["kind"][]): StatusRow => ({
  key,
  label: STATUS_LABEL[key],
  color: statusVar(key),
  doneIn,
});

/** All statuses in tile order. */
export const STATUS_TABLE: readonly StatusRow[] = [
  row("pure", ["game"]),
  row("nonmatching", []),
  row("open", []),
  row("object", ["sdk"]),
  row("asm", ["hand"]),
  // An SDK unit kept as assembly is the original PsyQ code, so it is matched too.
  row("assembly", ["sdk"]),
];

export const STATUS = Object.fromEntries(STATUS_TABLE.map((entry) => [entry.key, entry])) as Record<Status, StatusRow>;
export const STATUSES: readonly Status[] = STATUS_TABLE.map((entry) => entry.key);
/** PsyQ unit kinds, best first. */
export const TIERS: readonly Tier[] = ["object", "assembly"];

export const isStatus = (value: string): value is Status => Object.hasOwn(STATUS, value);
/** Game functions rebuilt, draft and not started, from the report's units; statuses with none are left out. */
export const codeCounts = (code: Code): [Status, number][] =>
  ([["pure", code.exact], ["nonmatching", code.draft], ["open", code.functions - code.exact - code.draft]] as [Status, number][]).filter(([, count]) => count);

/** The same split by code bytes. */
export const codeSizes = (code: Code): [Status, number][] =>
  ([["pure", code.exactBytes], ["nonmatching", code.draftBytes], ["open", code.bytes - code.exactBytes - code.draftBytes]] as [Status, number][]).filter(([, size]) => size);

/** A function is done when it builds to the original bytes: its fuzzy match is 100. */
export const isDone = (fn: Pick<Fn, "kind" | "status" | "fuzzy">): boolean => STATUS[fn.status].doneIn.includes(fn.kind) && fn.fuzzy === 100;
