// Which part of the game a target belongs to, declared as rules. The first rule whose pattern
// matches the target id gives the group; the groups are drawn in this order.
//
//   exe/slus_004_22, exe/logo            -> main        Main program
//   emi/etc/bate/..                      -> battle      (BATE is a battle overlay in ETC)
//   emi/etc/..                           -> system      Game system and menus
//   emi/battle/..                        -> battle      Battle
//   emi/bmagic/..                        -> magic       Battle magic
//   emi/boss/..                          -> bosses      Bosses
//   emi/plchar/..                        -> characters  Characters
//   emi/world00/area037/13               -> world       World areas (WORLD00 to WORLD04)
//   emi/scenario/..                      -> scenario    Scenario and cutscenes
//   anything else                        -> other       so no target disappears
//
// The rules list BATE before the rest of ETC; PAGE_ORDER sets the order on the page.
// `tiles` draws a group of many near-identical overlays as a grid of small image tiles. Each
// group's heading and note are in strings.ts (GROUP_LABEL, GROUP_NOTE).

import { GROUP_LABEL, GROUP_NOTE } from "../strings.ts";

interface Rule {
  key: string;
  pattern: RegExp;
  tiles: boolean;
}

const GROUP_RULES: readonly Rule[] = [
  { key: "main", pattern: /^exe\/(slus_004_22|logo)$/, tiles: false },
  { key: "battle", pattern: /^emi\/etc\/bate\//, tiles: false },
  { key: "system", pattern: /^emi\/etc\//, tiles: false },
  { key: "battle", pattern: /^emi\/battle\//, tiles: false },
  { key: "magic", pattern: /^emi\/bmagic\//, tiles: true },
  { key: "bosses", pattern: /^emi\/boss\//, tiles: true },
  { key: "characters", pattern: /^emi\/plchar\//, tiles: true },
  { key: "world", pattern: /^emi\/world\d+\//, tiles: true },
  { key: "scenario", pattern: /^emi\/scenario\//, tiles: false },
];
export const OTHER = "other";
/** The groups in page order; `other` closes it. */
const PAGE_ORDER = [
  "main",
  "system",
  "battle",
  "magic",
  "bosses",
  "characters",
  "world",
  "scenario",
  OTHER,
];

export const groupKey = (targetId: string): string =>
  GROUP_RULES.find((rule) => rule.pattern.test(targetId))?.key ?? OTHER;

/** Groups in page order. */
export const compareGroups = (a: { key: string }, b: { key: string }): number =>
  PAGE_ORDER.indexOf(a.key) - PAGE_ORDER.indexOf(b.key);

export const describeGroup = (
  key: string,
): { key: string; label: string; note: string; tiles: boolean } => ({
  key,
  label: GROUP_LABEL[key] ?? GROUP_LABEL[OTHER],
  note: GROUP_NOTE[key] ?? "",
  tiles: GROUP_RULES.some((rule) => rule.key === key && rule.tiles),
});
