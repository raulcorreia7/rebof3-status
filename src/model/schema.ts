// The data files the page reads, as Zod schemas: only the fields it uses. Parsing drops every
// other field and fails on a file whose shape changed. types.ts derives the input types from here.

import * as z from "zod/mini";

const count = z.number();
/** objdiff writes byte counts as strings. */
const measure = z.optional(z.coerce.number());

/** report.json: objdiff-cli report version 2. */
export const ReportSchema = z.object({
  version: z.optional(count),
  categories: z.array(z.object({ id: z.string(), measures: z.object({ fuzzy_match_percent: measure }) })),
  units: z.array(
    z.object({
      name: z.string(),
      measures: z.object({ total_code: measure, matched_code: measure, fuzzy_match_percent: measure }),
      metadata: z.object({
        complete: z.optional(z.boolean()),
        source_path: z.optional(z.string()),
        progress_categories: z.optional(z.array(z.string())),
      }),
    }),
  ),
});

/** status-data.json: bin/status --data --json, the data census. */
export const StatusDataSchema = z.object({
  targets: z.array(z.object({ target: z.string(), payload: count, data_payload: count, typed: count })),
  totals: z.object({
    data_payload: count,
    typed: count,
    /** Bytes in C as byte arrays named by address: not typed. */
    raw_c: z.optional(count),
    /** Bytes left out of data_payload: zero-filled reservations, image copies, PsyQ and asset spans. */
    reserved: z.optional(count),
    copied: z.optional(count),
    sdk: z.optional(count),
    asset: z.optional(count),
  }),
});

/** status.json: bin/status --json, the game code census. */
export const StatusCensusSchema = z.object({
  /** Absent from older publishes. */
  targets: z.optional(
    z.array(
      z.object({
        target: z.string(),
        /** Reviewed units with a NON_MATCHING draft. */
        non_matching: count,
        game: z.object({ exact: count, total: count, exact_bytes: count, bytes: count }),
      }),
    ),
  ),
  game_code: z.object({
    functions: count,
    exact: count,
    bytes: count,
    exact_bytes: count,
    /** The same four, each repeated function body once. */
    unique_functions: count,
    unique_exact: count,
    unique_bytes: count,
    unique_exact_bytes: count,
  }),
});

/** assets.json: disc assets by kind, written by the publisher. */
export const AssetCensusSchema = z.object({
  kinds: z.array(
    z.object({
      kind: z.string(),
      entries: count,
      bytes: count,
      /** `decoded` to an open format, `raw` (the stored bytes) or `none` (not extracted). */
      handling: z.string(),
      /** Bytes that export and import back to themselves. */
      round_trip_bytes: count,
    }),
  ),
  totals: z.object({ bytes: count, extracted_bytes: count, decoded_bytes: count, round_trip_bytes: count }),
});

/** history.json: one row of headline numbers per day; null where a day has no measure. */
export const HistorySchema = z.object({
  commit: z.string(),
  generated_at: z.string(),
  rows: z.array(z.catchall(z.object({ date: z.string(), revision: z.string(), source: z.string() }), z.nullable(z.union([count, z.string()])))),
});
