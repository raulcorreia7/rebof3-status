// The adapter: objdiff's report.json and bin/status's status-data.json in, the model the page
// and the picture draw (types.ts) out. Pure functions, so node:test covers them.

import { hex, share } from "./format.ts";
import { compareGroups, describeGroup, groupKey } from "./groups.ts";
import { byDay } from "./history.ts";
import { STATUS, STATUSES, isDone } from "./status.ts";
import type {
  Fn,
  Group,
  History,
  HistoryRow,
  Library,
  Measures,
  Model,
  Part,
  Report,
  ReportCategory,
  Target,
  Tier,
  Tally,
} from "../types.ts";

const CATEGORY = { game: "game", sdk: "sdk", hand: "hand-asm" } as const;
export const ASSEMBLY_LIBRARY = "assembly";
const PSYQ_OBJECT = /^toolchains\/psyq\/([^/]+)\/([^/]+)\//;
const EXE_NAME: Record<string, string> = { slus_004_22: "SLUS_004.22", logo: "LOGO.EXE" };

/** A measure is a number or a numeric string in the report. */
const num = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Count functions by status, with done totals and the code-byte weighted fuzzy match. */
export function tally(functions: Fn[]): Tally {
  const statuses = Object.fromEntries(STATUSES.map((key) => [key, { functions: 0, bytes: 0 }])) as Tally["statuses"];
  let bytes = 0;
  let done = 0;
  let doneBytes = 0;
  let fuzzyBytes = 0;
  for (const fn of functions) {
    statuses[fn.status].functions += 1;
    statuses[fn.status].bytes += fn.bytes;
    bytes += fn.bytes;
    fuzzyBytes += (fn.fuzzy * fn.bytes) / 100;
    if (isDone(fn)) {
      done += 1;
      doneBytes += fn.bytes;
    }
  }
  return { count: functions.length, bytes, done, doneBytes, statuses, percent: share(done, functions.length), fuzzy: share(fuzzyBytes, bytes) };
}

/** The display name of a target, derived from its id (`BATTLE.EMI slot 3`). */
export function targetName(id: string, archives: Map<string, number>): string {
  const parts = id.split("/");
  if (parts[0] === "exe") return EXE_NAME[parts[1] ?? ""] ?? id;
  const archive = parts[2] ?? parts[1] ?? id;
  const name = `${archive.toUpperCase()}.EMI`;
  const slot = parts[3];
  return (archives.get(archive) ?? 1) > 1 && slot ? `${name} slot ${Number(slot)}` : name;
}

/** The address a unit name carries (`func_801D1014`, `PopMatrix@0x80178BB4`), else null. */
export function unitAddress(name: string): number | null {
  const stem = name.slice(name.lastIndexOf("/") + 1);
  const found = /^func_([0-9A-F]{8})$/.exec(stem) ?? /@0x([0-9A-Fa-f]{1,8})$/.exec(stem);
  return found ? parseInt(found[1], 16) : null;
}

function statusOf(kind: Part, complete: boolean, source: string): Fn["status"] {
  if (kind === "game") return complete ? "pure" : source ? "nonmatching" : "open";
  if (kind === "hand") return complete ? "asm" : "assembly";
  return source ? "object" : "assembly";
}

/** The PsyQ library and version an SDK object path names. */
function sdkOrigin(source: string): { library: string; version: string | null; tier: Tier } {
  const found = PSYQ_OBJECT.exec(source);
  return found
    ? { library: found[2], version: found[1], tier: "object" }
    : { library: ASSEMBLY_LIBRARY, version: null, tier: "assembly" };
}

const category = (report: Report, id: string): ReportCategory => {
  const found = report.categories.find((entry) => entry.id === id);
  if (!found) throw new Error(`report.json has no ${id} category`);
  return found;
};

const measured = (functions: Fn[], source: { measures: Measures }): Tally => ({
  ...tally(functions),
  fuzzy: num(source.measures.fuzzy_match_percent),
});

function buildFunction(unit: Report["units"][number], target: string, targetLabel: string): Fn {
  const part = unit.metadata.progress_categories?.[0] ?? "";
  const kind = (Object.keys(CATEGORY) as (keyof typeof CATEGORY)[]).find((key) => CATEGORY[key] === part);
  if (!kind) throw new Error(`report unit ${unit.name} has unknown category ${part || "(none)"}`);
  const measures = unit.measures;
  const complete = unit.metadata.complete === true;
  const source = unit.metadata.source_path ?? "";
  const bytes = num(measures.total_code);
  const matched = num(measures.matched_code);
  const fuzzy = measures.fuzzy_match_percent === undefined ? (complete ? 100 : 0) : num(measures.fuzzy_match_percent);
  const name = unit.name.slice(target.length + 1);
  const address = unitAddress(unit.name);
  const status = statusOf(kind, complete, source);
  const origin = kind === "sdk" ? sdkOrigin(source) : null;
  const fn: Fn = {
    id: unit.name,
    target,
    addr: address === null ? "" : hex(address),
    address,
    name,
    bytes,
    matched: matched || (complete ? bytes : 0),
    fuzzy,
    status,
    kind,
    key: "",
    source: source || null,
    library: origin?.library,
    tier: origin?.tier,
    version: origin?.version ?? null,
    score: kind === "sdk" ? fuzzy : null,
  };
  fn.key = [fn.id, name, status, STATUS[status].label, targetLabel, kind, origin?.library ?? "", origin?.version ?? ""].join(" ").toLowerCase();
  return fn;
}

function buildLibraries(functions: Fn[]): Library[] {
  const groups = new Map<string, Fn[]>();
  for (const fn of functions) {
    const key = fn.library ?? ASSEMBLY_LIBRARY;
    const list = groups.get(key);
    if (list) list.push(fn);
    else groups.set(key, [fn]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === ASSEMBLY_LIBRARY ? 1 : b === ASSEMBLY_LIBRARY ? -1 : a.localeCompare(b)))
    .map(([name, units]) => {
      const versions: Record<string, number> = {};
      const tiers: Record<Tier, number> = { object: 0, assembly: 0 };
      for (const fn of units) {
        if (fn.version) versions[fn.version] = (versions[fn.version] ?? 0) + 1;
        if (fn.tier) tiers[fn.tier] += 1;
      }
      return { name, versions, tiers, functions: [...units].sort((a, b) => a.name.localeCompare(b.name)), ...tally(units) };
    });
}

export function buildModel(
  report: Report,
  status: { targets: { target: string; payload: number; data_payload: number; typed: number }[]; totals: { data_payload: number; typed: number } },
  history: History,
): Model {
  if (report.version !== undefined && report.version !== 2) throw new Error(`unsupported report.json version ${report.version}`);
  const gameSource = category(report, CATEGORY.game);
  const sdkSource = category(report, CATEGORY.sdk);
  const handSource = category(report, CATEGORY.hand);

  const archives = new Map<string, number>();
  for (const { target } of status.targets) {
    if (!target.startsWith("emi/")) continue;
    const archive = target.split("/")[2] ?? "";
    archives.set(archive, (archives.get(archive) ?? 0) + 1);
  }
  const targets: Target[] = status.targets.map((row) => ({
    id: row.target,
    name: targetName(row.target, archives),
    group: groupKey(row.target),
    groupLabel: "",
    size: row.payload,
    data: row.data_payload ? { bytes: row.data_payload, typed: row.typed } : null,
    functions: [],
    game: tally([]),
    all: tally([]),
  }));
  const targetById = new Map(targets.map((target) => [target.id, target]));
  const ids = [...targetById.keys()].sort((a, b) => b.length - a.length);

  for (const unit of report.units) {
    const id = ids.find((candidate) => unit.name.startsWith(`${candidate}/`));
    if (!id) throw new Error(`report unit ${unit.name} does not belong to a known target`);
    const target = targetById.get(id)!;
    target.functions.push(buildFunction(unit, id, target.name));
  }

  for (const target of targets) {
    target.functions.sort((a, b) => {
      if (a.address === null) return b.address === null ? 0 : 1;
      if (b.address === null) return -1;
      return a.address - b.address;
    });
    target.game = tally(target.functions.filter((fn) => fn.kind === "game"));
    target.all = tally(target.functions);
  }

  const functions = targets.flatMap((target) => target.functions);
  const functionById = new Map(functions.map((fn) => [fn.id, fn]));
  const groups: Group[] = [...new Set(targets.map((target) => target.group))].sort(compareGroups).map((key) => {
    const members = targets.filter((target) => target.group === key);
    const game = members.flatMap((target) => target.functions.filter((fn) => fn.kind === "game"));
    return { ...describeGroup(key), targets: members, ...tally(game) };
  });
  for (const group of groups) for (const target of group.targets) target.groupLabel = group.label;

  const game = measured(functions.filter((fn) => fn.kind === "game"), gameSource);
  const sdk = measured(functions.filter((fn) => fn.kind === "sdk"), sdkSource);
  const hand = measured(functions.filter((fn) => fn.kind === "hand"), handSource);
  const generatedAt = history.generated_at ?? "";
  const commit = history.commit ?? "";
  const data = status.totals.data_payload ? { bytes: status.totals.data_payload, typed: status.totals.typed } : null;
  const meta = { version: report.version ?? 0, generatedAt, date: generatedAt.slice(0, 10), commit, shortCommit: commit.slice(0, 12) };
  const rows: HistoryRow[] = [...(history.rows ?? [])];
  if (meta.date) {
    rows.push({
      date: meta.date,
      revision: meta.commit,
      source: "report",
      game_functions: game.count,
      game_matched: game.done,
      game_bytes: game.bytes,
      game_matched_bytes: game.doneBytes,
      sdk_functions: sdk.count,
      sdk_done: sdk.done,
      data_bytes: data?.bytes ?? null,
      data_typed: data?.typed ?? null,
    });
  }
  return {
    meta,
    game,
    sdk,
    hand,
    all: tally(functions),
    data,
    quality: {
      exact: game.done,
      inProgress: game.statuses.nonmatching.functions,
      notStarted: game.statuses.open.functions,
      hand: hand.count,
      handDone: hand.done,
      fuzzy: game.fuzzy,
    },
    groups,
    targets,
    targetById,
    functions,
    functionById,
    libraries: buildLibraries(functions.filter((fn) => fn.kind === "sdk")),
    history: byDay(rows),
  };
}
