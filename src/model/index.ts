// Model helpers shared by the page and the picture: lookup by id and neighbours in a target.
// The adapter that builds the model from report.json lives in model/report.ts.

import type { Model, Unit } from "../types.ts";

/** The source file before and after `unit` in its target, in address order. */
export function neighbours(model: Model, unit: Unit): { previous: Unit | null; next: Unit | null } {
  const list = model.targetById.get(unit.target)?.units ?? [];
  const at = list.indexOf(unit);
  return { previous: list[at - 1] ?? null, next: list[at + 1] ?? null };
}

/** Find a report unit (source file) by its objdiff name. */
export const findUnit = (model: Model, id: string): Unit | null => model.unitById.get(id) ?? null;
