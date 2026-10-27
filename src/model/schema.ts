// The data file the page reads, as a Zod schema: only the fields it uses. Parsing drops every
// other field and fails on a file whose shape changed. types.ts derives the input type from here.

import * as z from "zod/mini";

/** objdiff writes byte counts as strings. */
const measure = z.optional(z.coerce.number());

/** report.json: objdiff-cli report version 2. A unit is a source file holding one or more functions. */
export const ReportSchema = z.object({
  version: z.optional(z.number()),
  categories: z.array(
    z.object({ id: z.string(), measures: z.object({ fuzzy_match_percent: measure }) }),
  ),
  units: z.array(
    z.object({
      name: z.string(),
      functions: z.array(
        z.object({
          name: z.string(),
          size: measure,
          fuzzy_match_percent: measure,
          address: z.optional(z.string()),
        }),
      ),
      metadata: z.object({
        source_path: z.optional(z.string()),
        progress_categories: z.optional(z.array(z.string())),
      }),
    }),
  ),
});
