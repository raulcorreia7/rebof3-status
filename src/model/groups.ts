// Which part of the game a target belongs to, declared as rules. The first rule whose pattern
// matches the target id gives the group key (`$1` is the first capture).
//
//   exe/slus_004_22        -> exe/main     (the main executable)
//   exe/logo               -> exe/logo
//   emi/world00/... to emi/world04/... -> emi/world (the areas span five disc folders)
//   emi/<family>/<name>/NN -> emi/<family> (etc, battle, bmagic, boss, plchar, scenario)
//
// A new overlay family needs no rule: it becomes a group of its own, headed by groupLabel in
// strings.ts. Give a group a heading and note in GROUP_LABEL and GROUP_NOTE there.

import { GROUP_NOTE, groupLabel } from "../strings.ts";

const GROUP_RULES: readonly [pattern: RegExp, group: string][] = [
  [/^exe\/slus_004_22$/, "exe/main"],
  [/^exe\/logo$/, "exe/logo"],
  [/^exe\//, "exe/other"],
  [/^emi\/world\d+\//, "emi/world"],
  [/^(emi\/[^/]+)\//, "$1"],
];
/** The executables lead in this order; every overlay group follows them. */
const PROGRAMS = ["exe/main", "exe/logo", "exe/other"];

export function groupKey(targetId: string): string {
  for (const [pattern, group] of GROUP_RULES) {
    const found = pattern.exec(targetId);
    if (found) return group.replace(/\$(\d)/g, (_, index) => found[Number(index)]);
  }
  return targetId;
}

const rank = (key: string): number => {
  const at = PROGRAMS.indexOf(key);
  return at < 0 ? PROGRAMS.length : at;
};

/** The executables first, then the overlay groups, biggest game code first. */
export const compareGroups = (a: { key: string; bytes: number }, b: { key: string; bytes: number }): number =>
  rank(a.key) - rank(b.key) || b.bytes - a.bytes || a.key.localeCompare(b.key);

export const describeGroup = (key: string): { key: string; label: string; note: string } => ({
  key,
  label: groupLabel(key),
  note: GROUP_NOTE[key] ?? "",
});
