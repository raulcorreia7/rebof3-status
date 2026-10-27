// The function search: the game functions that match some words, sorted.

import type { Fn, Model } from "../types.ts";
import type { Route } from "./route.ts";
import { STATUSES } from "./status.ts";

/** Rows the function table adds each time it is asked for more. */
export const PAGE_STEP = 200;

const words = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(Boolean);

/** The game functions that match the search words, in the route's order. */
export function browse(model: Model, route: Route): Fn[] {
  const needed = words(route.q);
  const targetOrder = new Map(model.targets.map((target, index) => [target.id, index]));
  const found = model.functions.filter(
    (fn) => fn.kind === "game" && needed.every((word) => fn.key.includes(word)),
  );
  const byAddress = (a: Fn, b: Fn) =>
    (targetOrder.get(a.target) ?? 0) - (targetOrder.get(b.target) ?? 0)
    || (a.address === null ? 1 : b.address === null ? -1 : a.address - b.address)
    || a.unit.localeCompare(b.unit)
    || a.offset - b.offset;
  const compare: Record<Route["sort"], (a: Fn, b: Fn) => number> = {
    address: byAddress,
    size: (a, b) => a.bytes - b.bytes || byAddress(a, b),
    name: (a, b) => a.name.localeCompare(b.name) || byAddress(a, b),
    status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || byAddress(a, b),
  };
  found.sort(compare[route.sort]);
  if (route.dir === "desc") found.reverse();
  return found;
}
