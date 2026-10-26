// Model helpers shared by the page and the picture: lookup by id and neighbours in a target.
// The adapter that builds the model from report.json lives in model/report.ts.

import type { Fn, Model } from "../types.ts";

/** The function before and after `fn` in its target, in address order. */
export function neighbours(model: Model, fn: Fn): { previous: Fn | null; next: Fn | null } {
  const list = model.targetById.get(fn.target)?.functions ?? [];
  const at = list.indexOf(fn);
  return { previous: list[at - 1] ?? null, next: list[at + 1] ?? null };
}

/** Find a function by its objdiff unit name. */
export const findFunction = (model: Model, id: string): Fn | null => model.functionById.get(id) ?? null;
