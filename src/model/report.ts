// The adapter: objdiff's report.json in, the model the page and the picture draw (types.ts) out.
// Pure functions, so node:test covers them.

import { hex, share } from "./format.ts";
import { compareGroups, describeGroup, groupKey } from "./groups.ts";
import * as z from "zod/mini";
import { ReportSchema } from "./schema.ts";
import { STATUS, STATUSES, isDone } from "./status.ts";
import type { Code, Fn, Group, Headline, Library, Model, Part, Report, Target, Tally, Tier } from "../types.ts";

const CATEGORY = { game: "game", sdk: "sdk", hand: "hand-asm" } as const;
export const ASSEMBLY_LIBRARY = "assembly";
const PSYQ_OBJECT = /^toolchains\/psyq\/([^/]+)\/([^/]+)\//;
const EXE_NAME: Record<string, string> = { slus_004_22: "SLUS_004.22", logo: "LOGO.EXE" };

/** Count functions by status, with done totals and the code-byte weighted fuzzy match. */
function tally(functions: Fn[]): Tally {
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
function targetName(id: string, archives: Map<string, number>): string {
  const parts = id.split("/");
  if (parts[0] === "exe") return EXE_NAME[parts[1] ?? ""] ?? id;
  const archive = parts[2] ?? parts[1] ?? id;
  const name = `${archive.toUpperCase()}.EMI`;
  const slot = parts[3];
  return (archives.get(archive) ?? 1) > 1 && slot ? `${name} slot ${Number(slot)}` : name;
}

/** The address a unit name carries (`func_801D1014`, `PopMatrix@0x80178BB4`), else null. */
function unitAddress(name: string): number | null {
  const stem = name.slice(name.lastIndexOf("/") + 1);
  const found = /^func_([0-9A-F]{8})$/.exec(stem) ?? /@0x([0-9A-Fa-f]{1,8})$/.exec(stem);
  return found ? parseInt(found[1], 16) : null;
}

/**
 * The image a unit belongs to. rebof3 names every unit `<image>/<source stem>`: the main
 * executables are `exe/<name>`, every overlay `emi/<family>/<archive>/<slot>`.
 */
export function unitTarget(name: string): string {
  const parts = name.split("/");
  if (parts[0] === "exe") return parts.slice(0, 2).join("/");
  if (parts[0] === "emi" && parts.length >= 5) return parts.slice(0, 4).join("/");
  return parts.slice(0, -1).join("/");
}

/**
 * A game unit is a draft when its C builds and objdiff matches part of it. A unit whose C only
 * includes the original assembly (INCLUDE_ASM) has a source file too, but measures 0%: not started.
 */
function statusOf(kind: Part, complete: boolean, source: string, fuzzy: number): Fn["status"] {
  if (kind === "game") return complete ? "pure" : source && fuzzy > 0 ? "nonmatching" : "open";
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

const category = (report: Report, id: string): Report["categories"][number] => {
  const found = report.categories.find((entry) => entry.id === id);
  if (!found) throw new Error(`report.json has no ${id} category`);
  return found;
};

/** The report counts the part's functions; its category carries the byte-weighted fuzzy match. */
const measured = (functions: Fn[], source: Report["categories"][number]): Tally => ({
  ...tally(functions),
  fuzzy: source.measures.fuzzy_match_percent ?? 0,
});

function buildFunction(unit: Report["units"][number], target: Target): Fn {
  const part = unit.metadata.progress_categories?.[0] ?? "";
  const kind = (Object.keys(CATEGORY) as (keyof typeof CATEGORY)[]).find((key) => CATEGORY[key] === part);
  if (!kind) throw new Error(`report unit ${unit.name} has unknown category ${part || "(none)"}`);
  const measures = unit.measures;
  const complete = unit.metadata.complete === true;
  const source = unit.metadata.source_path ?? "";
  const bytes = measures.total_code ?? 0;
  const fuzzy = measures.fuzzy_match_percent ?? (complete ? 100 : 0);
  const address = unitAddress(unit.name);
  const status = statusOf(kind, complete, source, fuzzy);
  const origin = kind === "sdk" ? sdkOrigin(source) : null;
  const name = unit.name.slice(target.id.length + 1);
  const fn: Fn = {
    id: unit.name,
    target: target.id,
    addr: address === null ? "" : hex(address),
    address,
    name,
    bytes,
    fuzzy,
    fuzzyReported: measures.fuzzy_match_percent !== undefined,
    status,
    kind,
    key: "",
    source: source || null,
    library: origin?.library,
    tier: origin?.tier,
    version: origin?.version ?? null,
  };
  fn.key = [fn.id, name, status, STATUS[status].label, target.name, kind, origin?.library ?? "", origin?.version ?? ""].join(" ").toLowerCase();
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

/** Sum game code. */
const addCode = (items: Code[]): Code =>
  items.reduce(
    (sum, code) => ({
      functions: sum.functions + code.functions,
      exact: sum.exact + code.exact,
      draft: sum.draft + code.draft,
      bytes: sum.bytes + code.bytes,
      exactBytes: sum.exactBytes + code.exactBytes,
    }),
    { functions: 0, exact: 0, draft: 0, bytes: 0, exactBytes: 0 },
  );

/** The file checked against its schema; the error names the file and the field that failed. */
function parse<T>(name: string, schema: z.ZodMiniType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${name} does not have the expected shape: ${z.prettifyError(result.error)}`);
  return result.data;
}

/** Check report.json against its schema, then build the model. */
export const modelFromReport = (file: unknown): Model => buildModel(parse("report.json", ReportSchema, file));

function buildModel(report: Report): Model {
  if (report.version !== undefined && report.version !== 2) throw new Error(`unsupported report.json version ${report.version}`);
  const gameSource = category(report, CATEGORY.game);
  const sdkSource = category(report, CATEGORY.sdk);
  const handSource = category(report, CATEGORY.hand);

  // The report has no target list: every unit names its image, and the image names its group.
  const ids = [...new Set(report.units.map((unit) => unitTarget(unit.name)))].sort((a, b) => a.localeCompare(b));
  const archives = new Map<string, number>();
  for (const id of ids) {
    if (!id.startsWith("emi/")) continue;
    const archive = id.split("/")[2] ?? "";
    archives.set(archive, (archives.get(archive) ?? 0) + 1);
  }
  const targets: Target[] = ids.map((id) => {
    const group = groupKey(id);
    return {
      id,
      name: targetName(id, archives),
      group,
      groupLabel: describeGroup(group).label,
      code: { functions: 0, exact: 0, draft: 0, bytes: 0, exactBytes: 0 },
      functions: [],
      game: tally([]),
      all: tally([]),
    };
  });
  const targetById = new Map(targets.map((target) => [target.id, target]));

  for (const unit of report.units) {
    const target = targetById.get(unitTarget(unit.name));
    if (!target) throw new Error(`report unit ${unit.name} does not belong to a known target`);
    target.functions.push(buildFunction(unit, target));
  }

  for (const target of targets) {
    target.functions.sort((a, b) => {
      if (a.address === null) return b.address === null ? 0 : 1;
      if (b.address === null) return -1;
      return a.address - b.address;
    });
    target.game = tally(target.functions.filter((fn) => fn.kind === "game"));
    target.all = tally(target.functions);
    target.code = {
      functions: target.game.count,
      exact: target.game.done,
      draft: target.game.statuses.nonmatching.functions,
      bytes: target.game.bytes,
      exactBytes: target.game.doneBytes,
    };
  }

  const functions = targets.flatMap((target) => target.functions);
  const functionById = new Map(functions.map((fn) => [fn.id, fn]));
  // Within a group the biggest target leads.
  const bySize = (a: Target, b: Target) => b.code.bytes - a.code.bytes || a.name.localeCompare(b.name);
  const groups: Group[] = [...new Set(targets.map((target) => target.group))]
    .map((key) => {
      const members = targets.filter((target) => target.group === key).sort(bySize);
      const game = members.flatMap((target) => target.functions.filter((fn) => fn.kind === "game"));
      return { ...describeGroup(key), targets: members, code: addCode(members.map((target) => target.code)), ...tally(game) };
    })
    .sort(compareGroups);
  for (const group of groups) for (const target of group.targets) target.groupLabel = group.label;

  const game = measured(functions.filter((fn) => fn.kind === "game"), gameSource);
  const sdk = measured(functions.filter((fn) => fn.kind === "sdk"), sdkSource);
  const hand = measured(functions.filter((fn) => fn.kind === "hand"), handSource);
  const code = addCode(targets.map((target) => target.code));
  const headline: Headline = { game: { functions: game.count, exact: game.done, bytes: game.bytes, exactBytes: game.doneBytes } };
  return {
    meta: { version: report.version ?? 0 },
    headline,
    code,
    game,
    sdk,
    hand,
    all: tally(functions),
    quality: {
      exact: code.exact,
      inProgress: code.draft,
      notStarted: code.functions - code.exact - code.draft,
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
  };
}
