// Function statuses as progress.json defines them (tools/bof3/progress/document.py in rebof3).

import type { DataStatus, Fn, Status, Tier } from "../types.ts";

/** Status keys in tile order: finished work first. */
export const STATUSES: readonly Status[] = ["pure", "fake_match", "asm", "object", "assembly", "nonmatching", "open"];
/** A game function is matched when it builds to the original bytes. */
export const GAME_DONE: readonly Status[] = ["pure", "fake_match", "asm"];
/** An SDK function is done when it is exact C or links from an original object. */
export const SDK_DONE: readonly Status[] = ["pure", "object"];
/** Statuses whose function has a C file in the decompilation. */
export const HAS_C_FILE: readonly Status[] = ["pure", "fake_match", "asm", "nonmatching"];
/** PsyQ match tiers, best first. */
export const TIERS: readonly Tier[] = ["c", "object", "partial", "assembly", "unmatched"];
/** Map rows that are not functions. */
export const DATA_STATUSES: readonly DataStatus[] = ["typed", "raw", "header"];

export const isStatus = (value: string): value is Status => (STATUSES as readonly string[]).includes(value);
export const isDone = (fn: Pick<Fn, "kind" | "status">): boolean => (fn.kind === "sdk" ? SDK_DONE : GAME_DONE).includes(fn.status);
