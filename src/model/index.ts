// The data model: progress.json in, everything the page and the picture need out.
// Pure functions only, so node:test covers them (test/model.test.mts).

import { SITE } from "../strings.ts";
import type { Fn, Group, Library, Model, ProgressData, RawTarget, Tally, Target } from "../types.ts";
import { hex, share } from "./format.ts";
import { compareGroups, describeGroup, groupKey } from "./groups.ts";
import { byDay, snapshotRow } from "./history.ts";
import { STATUS, STATUSES, isDone } from "./status.ts";

const KIND = { f: "game", s: "sdk" } as const;

const emptyStatuses = (): Tally["statuses"] =>
  Object.fromEntries(STATUSES.map((key) => [key, { functions: 0, bytes: 0 }])) as Tally["statuses"];

/** Count functions by status: totals, the done share and one {functions, bytes} pair per status. */
export function tally(functions: Fn[]): Tally {
  const statuses = emptyStatuses();
  let bytes = 0;
  let done = 0;
  let doneBytes = 0;
  for (const fn of functions) {
    statuses[fn.status].functions += 1;
    statuses[fn.status].bytes += fn.bytes;
    bytes += fn.bytes;
    if (isDone(fn)) {
      done += 1;
      doneBytes += fn.bytes;
    }
  }
  return { count: functions.length, bytes, done, doneBytes, statuses, percent: share(done, functions.length) };
}

/**
 * Path of the C file of a function in rebof3, from the project's naming rule
 * (`src/<target id>/<function name>.c`), or null when the function has no C file.
 */
export function sourcePath(fn: Pick<Fn, "target" | "name" | "status">): string | null {
  return STATUS[fn.status].hasC ? `src/${fn.target}/${fn.name}.c` : null;
}

export const sourceUrl = (commit: string, path: string): string => `${SITE.repoUrl}/blob/${commit}/${path}`;
export const commitUrl = (commit: string): string => `${SITE.repoUrl}/commit/${commit}`;

function buildTarget(raw: RawTarget): Target {
  const base = parseInt(raw.base, 16);
  const end = parseInt(raw.end, 16);
  const functions: Fn[] = [];
  for (const [offset, size, kind, status, name] of raw.units) {
    if (kind === "d") continue;
    const address = base + offset;
    const fn = { id: `${raw.id}@${hex(address)}`, target: raw.id, addr: hex(address), address, name, bytes: size, status, kind: KIND[kind], key: "" } as Fn;
    fn.key = `${fn.id} ${name} ${status} ${STATUS[fn.status].label} ${raw.name} ${fn.kind === "sdk" ? "psyq sdk" : "game"}`.toLowerCase();
    functions.push(fn);
  }
  const empty = tally([]);
  return {
    id: raw.id,
    name: raw.name,
    group: groupKey(raw.id),
    groupLabel: "",
    base,
    end,
    size: end - base,
    counts: raw.counts,
    link: raw.link ?? null,
    layout: raw.layout,
    data: raw.data ?? null,
    units: raw.units,
    functions,
    game: empty,
    all: empty,
  };
}

function attachLibraries(data: ProgressData, functionById: Map<string, Fn>): Library[] {
  return data.libraries.map((lib) => {
    const functions = lib.functions.map((record) => {
      const fn = functionById.get(`${record.target}@${record.addr}`);
      if (!fn) throw new Error(`library ${lib.name} lists ${record.target}@${record.addr}, which is not in the targets`);
      Object.assign(fn, { library: lib.name, tier: record.tier, version: record.version, score: record.score });
      return fn;
    });
    return { name: lib.name, versions: lib.versions, tiers: lib.tiers, functions, ...tally(functions) };
  });
}

function buildGroups(targets: Target[]): Group[] {
  const keys = [...new Set(targets.map((target) => target.group))].sort(compareGroups);
  return keys.map((key) => {
    const members = targets.filter((target) => target.group === key);
    const game = members.flatMap((target) => target.functions.filter((fn) => fn.kind === "game"));
    return { ...describeGroup(key), targets: members, ...tally(game) };
  });
}

export function buildModel(data: ProgressData): Model {
  const targets = data.targets.map(buildTarget);
  const functions = targets.flatMap((target) => target.functions);
  const functionById = new Map(functions.map((fn) => [fn.id, fn]));
  const libraries = attachLibraries(data, functionById);
  for (const target of targets) {
    target.game = tally(target.functions.filter((fn) => fn.kind === "game"));
    target.all = tally(target.functions);
  }
  const groups = buildGroups(targets);
  for (const group of groups) for (const target of group.targets) target.groupLabel = group.label;
  return {
    meta: {
      schema: data.schema,
      generatedAt: data.generated_at,
      date: data.generated_at.slice(0, 10),
      commit: data.commit,
      shortCommit: data.commit.slice(0, 12),
      dirty: data.dirty,
    },
    summary: data.summary,
    quality: data.summary.quality,
    links: data.summary.links,
    layout: data.summary.layout,
    data: data.summary.data,
    all: tally(functions),
    game: tally(functions.filter((fn) => fn.kind === "game")),
    sdk: tally(functions.filter((fn) => fn.kind === "sdk")),
    groups,
    targets,
    targetById: new Map(targets.map((target) => [target.id, target])),
    functions,
    functionById,
    libraries,
    history: byDay([...data.history, snapshotRow(data)]),
  };
}

/** The function before and after `fn` in its target, in address order. */
export function neighbours(model: Model, fn: Fn): { previous: Fn | null; next: Fn | null } {
  const list = model.targetById.get(fn.target)?.functions ?? [];
  const at = list.indexOf(fn);
  return { previous: list[at - 1] ?? null, next: list[at + 1] ?? null };
}

/**
 * Find a function from a link. The target part may be a prefix of the id: `exe` finds the first
 * executable that has the address.
 */
export function findFunction(model: Model, targetPart: string, address: string): Fn | null {
  const parsed = parseInt(address, 16);
  if (!Number.isFinite(parsed)) return null;
  const wanted = hex(parsed);
  const exact = model.functionById.get(`${targetPart}@${wanted}`);
  if (exact) return exact;
  return model.functions.find((fn) => fn.addr === wanted && fn.target.startsWith(`${targetPart}/`)) ?? null;
}
