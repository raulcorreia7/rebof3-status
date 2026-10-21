// Which part of the game a target belongs to, derived from the target id.
//
//   exe/slus_004_22        -> exe/main     (the main executable)
//   exe/logo               -> exe/logo
//   emi/<family>/<name>/NN -> emi/<family> (etc, battle, scenario, world00, ...)
//
// Targets inside a group keep the order of progress.json.

import { GROUP_NOTE, groupLabel } from "../strings.ts";

const MAIN_EXECUTABLE = "exe/slus_004_22";
// The executables first, then the overlays.
const GROUP_ORDER = ["exe/main", "exe/logo", "emi/etc", "emi/battle", "emi/scenario", "emi/world00"];

export function groupKey(targetId: string): string {
  const [kind, family] = targetId.split("/");
  if (kind === "exe") return targetId === MAIN_EXECUTABLE ? "exe/main" : family === "logo" ? "exe/logo" : "exe/other";
  return `${kind}/${family}`;
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
