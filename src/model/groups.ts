// Which part of the game a target belongs to, declared as rules. The first rule whose pattern
// matches the target id gives the group key (`$1` is the first capture).
//
//   exe/slus_004_22        -> exe/main     (the main executable)
//   exe/logo               -> exe/logo
//   emi/<family>/<name>/NN -> emi/<family> (etc, battle, scenario, world00, ...)
//
// A new overlay family needs no rule: it becomes a group of its own, headed by groupLabel in
// strings.ts. Give a group a heading and note in GROUP_LABEL and GROUP_NOTE there, and a place
// in GROUP_ORDER here.

import { GROUP_NOTE, groupLabel } from "../strings.ts";

const GROUP_RULES: readonly [pattern: RegExp, group: string][] = [
  [/^exe\/slus_004_22$/, "exe/main"],
  [/^exe\/logo$/, "exe/logo"],
  [/^exe\//, "exe/other"],
  [/^(emi\/[^/]+)\//, "$1"],
];
/** The executables first, then the overlays; unlisted groups follow in alphabetical order. */
const GROUP_ORDER = ["exe/main", "exe/logo", "emi/etc", "emi/battle", "emi/scenario", "emi/world00"];

export function groupKey(targetId: string): string {
  for (const [pattern, group] of GROUP_RULES) {
    const found = pattern.exec(targetId);
    if (found) return group.replace(/\$(\d)/g, (_, index) => found[Number(index)]);
  }
  return targetId;
}

const rank = (key: string): number => {
  const at = GROUP_ORDER.indexOf(key);
  return at < 0 ? GROUP_ORDER.length : at;
};

export const compareGroups = (a: string, b: string): number => rank(a) - rank(b) || a.localeCompare(b);

export const describeGroup = (key: string): { key: string; label: string; note: string } => ({
  key,
  label: groupLabel(key),
  note: GROUP_NOTE[key] ?? "",
});
