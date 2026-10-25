// The adapter: objdiff's report.json, bin/status's status-data.json and status.json, and the
// publisher's assets.json in, the model the page and the picture draw (types.ts) out. Pure
// functions, so node:test covers them.

import { hex, share } from "./format.ts";
import { compareGroups, describeGroup, groupKey } from "./groups.ts";
import * as z from "zod/mini";
import { byDay } from "./history.ts";
import { AssetCensusSchema, HistorySchema, ReportSchema, StatusCensusSchema, StatusDataSchema } from "./schema.ts";
import { STATUS, STATUSES, isDone } from "./status.ts";
import type {
  AssetCensus,
  Code,
  Fn,
  Group,
  Headline,
  History,
  HistoryRow,
  Library,
  Model,
  Part,
  Report,
  StatusCensus,
  StatusCensusTarget,
  StatusData,
  Target,
  Tier,
  Tally,
} from "../types.ts";

const CATEGORY = { game: "game", sdk: "sdk", hand: "hand-asm" } as const;
export const ASSEMBLY_LIBRARY = "assembly";
const PSYQ_OBJECT = /^toolchains\/psyq\/([^/]+)\/([^/]+)\//;
const EXE_NAME: Record<string, string> = { slus_004_22: "SLUS_004.22", logo: "LOGO.EXE" };

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

const measured = (functions: Fn[], source: Report["categories"][number]): Tally => ({
  ...tally(functions),
  fuzzy: source.measures.fuzzy_match_percent ?? 0,
});

function buildFunction(unit: Report["units"][number], target: string, targetLabel: string): Fn {
  const part = unit.metadata.progress_categories?.[0] ?? "";
  const kind = (Object.keys(CATEGORY) as (keyof typeof CATEGORY)[]).find((key) => CATEGORY[key] === part);
  if (!kind) throw new Error(`report unit ${unit.name} has unknown category ${part || "(none)"}`);
  const measures = unit.measures;
  const complete = unit.metadata.complete === true;
  const source = unit.metadata.source_path ?? "";
  const bytes = measures.total_code ?? 0;
  const matched = measures.matched_code ?? 0;
  const fuzzy = measures.fuzzy_match_percent ?? (complete ? 100 : 0);
  const name = unit.name.slice(target.length + 1);
  const address = unitAddress(unit.name);
  const status = statusOf(kind, complete, source, fuzzy);
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

/**
 * The headline. Game code comes from bin/status's census of every target map when status.json is
 * published; the report holds only the units whose split asm it finds, so it is the fallback.
 */
function buildHeadline(game: Tally, data: Model["data"], totals: StatusData["totals"], census: StatusCensus | null, assets: AssetCensus | null): Headline {
  const code = census?.game_code;
  return {
    game: code
      ? {
          functions: code.functions,
          exact: code.exact,
          bytes: code.bytes,
          exactBytes: code.exact_bytes,
          unique: { functions: code.unique_functions, exact: code.unique_exact, bytes: code.unique_bytes, exactBytes: code.unique_exact_bytes },
        }
      : { functions: game.count, exact: game.done, bytes: game.bytes, exactBytes: game.doneBytes, unique: null },
    data: data
      ? {
          ...data,
          rawC: totals.raw_c ?? null,
          apart: totals.reserved === undefined ? null : { reserved: totals.reserved, copied: totals.copied ?? 0, sdk: totals.sdk ?? 0, asset: totals.asset ?? 0 },
        }
      : null,
    assets: assets
      ? {
          bytes: assets.totals.bytes,
          extracted: assets.totals.extracted_bytes,
          decoded: assets.totals.decoded_bytes,
          roundTrip: assets.totals.round_trip_bytes,
          kinds: assets.kinds,
        }
      : null,
  };
}

/** The point the headline adds to the history: today's published row, if any, with the headline numbers over it. */
function headlineRow(rows: HistoryRow[], date: string, commit: string, headline: Headline, sdk: Tally): HistoryRow {
  const { game, data, assets } = headline;
  return {
    ...rows.filter((row) => row.date === date).pop(),
    date,
    revision: commit,
    source: "report",
    game_functions: game.functions,
    game_matched: game.exact,
    game_bytes: game.bytes,
    game_matched_bytes: game.exactBytes,
    game_unique: game.unique?.functions ?? null,
    game_unique_matched: game.unique?.exact ?? null,
    game_unique_bytes: game.unique?.bytes ?? null,
    game_unique_matched_bytes: game.unique?.exactBytes ?? null,
    sdk_functions: sdk.count,
    sdk_done: sdk.done,
    data_bytes: data?.bytes ?? null,
    data_typed: data?.typed ?? null,
    data_raw_c: data?.rawC ?? null,
    asset_bytes: assets?.bytes ?? null,
    asset_extracted_bytes: assets?.extracted ?? null,
    asset_decoded_bytes: assets?.decoded ?? null,
    asset_round_trip_bytes: assets?.roundTrip ?? null,
  };
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

/** bin/status's count of one target. Its draft count covers every reviewed unit, so it is capped at the game functions not exact. */
const censusCode = (row: StatusCensusTarget | undefined): Code => {
  const game = row?.game ?? { exact: 0, total: 0, exact_bytes: 0, bytes: 0 };
  return { functions: game.total, exact: game.exact, draft: Math.min(row?.non_matching ?? 0, game.total - game.exact), bytes: game.bytes, exactBytes: game.exact_bytes };
};

/** The report's count of one target, for a status.json without targets. */
const reportCode = (game: Tally): Code => ({
  functions: game.count,
  exact: game.done,
  draft: game.statuses.nonmatching.functions,
  bytes: game.bytes,
  exactBytes: game.doneBytes,
});

/** The data files as fetched or read; status.json and assets.json are null when not published. */
export interface DataFiles {
  report: unknown;
  data: unknown;
  history: unknown;
  census?: unknown;
  assets?: unknown;
}

/** The file checked against its schema; the error names the file and the field that failed. */
function parse<T>(name: string, schema: z.ZodMiniType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${name} does not have the expected shape: ${z.prettifyError(result.error)}`);
  return result.data;
}

/** Check each file against its schema, then build the model. */
export const modelFromFiles = (files: DataFiles): Model =>
  buildModel(parse("report.json", ReportSchema, files.report), parse("status-data.json", StatusDataSchema, files.data), parse("history.json", HistorySchema, files.history), {
    census: files.census == null ? null : parse("status.json", StatusCensusSchema, files.census),
    assets: files.assets == null ? null : parse("assets.json", AssetCensusSchema, files.assets),
  });

export function buildModel(
  report: Report,
  status: StatusData,
  history: History,
  extra: { census?: StatusCensus | null; assets?: AssetCensus | null } = {},
): Model {
  if (report.version !== undefined && report.version !== 2) throw new Error(`unsupported report.json version ${report.version}`);
  const gameSource = category(report, CATEGORY.game);
  const sdkSource = category(report, CATEGORY.sdk);
  const handSource = category(report, CATEGORY.hand);

  // bin/status and the data census measure the same target maps; a target only one of them
  // names still gets a row, so its code is never lost.
  const census = extra.census?.targets ? new Map(extra.census.targets.map((row) => [row.target, row])) : null;
  const rows = [...status.targets];
  const known = new Set(rows.map((row) => row.target));
  for (const id of census?.keys() ?? []) if (!known.has(id)) rows.push({ target: id, payload: 0, data_payload: 0, typed: 0 });

  const archives = new Map<string, number>();
  for (const { target } of rows) {
    if (!target.startsWith("emi/")) continue;
    const archive = target.split("/")[2] ?? "";
    archives.set(archive, (archives.get(archive) ?? 0) + 1);
  }
  // The object census sums .rodata/.data from every compiled object; a draft can emit more than
  // the reviewed map counts. start/08's func_801DEEE8.o carries a 44-byte jump table where the map
  // has a 24-byte rodata placement. Cap at the payload so a target never reads above 100%.
  const targets: Target[] = rows.map((row) => {
    const typed = row.data_payload ? Math.min(row.typed, row.data_payload) : 0;
    return {
      id: row.target,
      name: targetName(row.target, archives),
      group: groupKey(row.target),
      groupLabel: "",
      size: row.payload,
      data: row.data_payload ? { bytes: row.data_payload, typed } : null,
      code: censusCode(census?.get(row.target)),
      functions: [],
      game: tally([]),
      all: tally([]),
    };
  });
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
    if (!census) target.code = reportCode(target.game);
  }

  const functions = targets.flatMap((target) => target.functions);
  const functionById = new Map(functions.map((fn) => [fn.id, fn]));
  // Within a group the biggest target leads; data-only targets, with no game code, close it.
  const bySize = (a: Target, b: Target) => b.code.bytes - a.code.bytes || (b.data?.bytes ?? 0) - (a.data?.bytes ?? 0) || a.name.localeCompare(b.name);
  const groups: Group[] = [...new Set(targets.map((target) => target.group))]
    .map((key) => {
      const members = targets.filter((target) => target.group === key).sort(bySize);
      const game = members.flatMap((target) => target.functions.filter((fn) => fn.kind === "game"));
      const data = members.reduce((sum, t) => ({ bytes: sum.bytes + (t.data?.bytes ?? 0), typed: sum.typed + (t.data?.typed ?? 0) }), { bytes: 0, typed: 0 });
      return { ...describeGroup(key), targets: members, code: addCode(members.map((t) => t.code)), ...tally(game), data: data.bytes ? data : null };
    })
    .sort(compareGroups);
  for (const group of groups) for (const target of group.targets) target.groupLabel = group.label;

  const game = measured(functions.filter((fn) => fn.kind === "game"), gameSource);
  const sdk = measured(functions.filter((fn) => fn.kind === "sdk"), sdkSource);
  const hand = measured(functions.filter((fn) => fn.kind === "hand"), handSource);
  const generatedAt = history.generated_at;
  const commit = history.commit;
  const data = status.totals.data_payload
    ? { bytes: status.totals.data_payload, typed: Math.min(status.totals.typed, status.totals.data_payload) }
    : null;
  const meta = { version: report.version ?? 0, generatedAt, date: generatedAt.slice(0, 10), commit, shortCommit: commit.slice(0, 12) };
  const headline = buildHeadline(game, data, status.totals, extra.census ?? null, extra.assets ?? null);
  const days: HistoryRow[] = [...history.rows];
  if (meta.date) days.push(headlineRow(days, meta.date, meta.commit, headline, sdk));
  const code = addCode(targets.map((target) => target.code));
  return {
    meta,
    headline,
    code,
    game,
    sdk,
    hand,
    all: tally(functions),
    data,
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
    history: byDay(days),
  };
}
