// The data file the page reads, as a Zod schema: only the fields it uses. Parsing drops every
// other field and fails on a file whose shape changed. types.ts derives the input type from here.

import * as z from "zod/mini";

/** objdiff writes byte counts as strings. */
const measure = z.optional(z.coerce.number());

/** report.json: objdiff-cli report version 2. */
export const ReportSchema = z.object({
  version: z.optional(z.number()),
  categories: z.array(z.object({ id: z.string(), measures: z.object({ fuzzy_match_percent: measure }) })),
  units: z.array(
    z.object({
      name: z.string(),
      measures: z.object({ total_code: measure, fuzzy_match_percent: measure }),
      metadata: z.object({
        complete: z.optional(z.boolean()),
        source_path: z.optional(z.string()),
        progress_categories: z.optional(z.array(z.string())),
      }),
    }),
  ),
});
