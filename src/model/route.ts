// The page state that a link carries, kept in the URL hash so every view is shareable.

//   #fn/exe%2Fslus_004_22%2Ffunc_8015AD00   open a function in the inspector
//   #image/emi%2Fworld00%2Farea037%2F13     open an image treemap
//   #part/battle                             open a part treemap
//   #group/battle                            older part link, redirected to #part/battle
//   #?q=cure&st=pure,open&sort=size          function browser filters

// A parameter that holds its default value is left out of the hash.

import type { Part, Status } from "../types.ts";
import { isStatus } from "./status.ts";

export type View =
  | { kind: "home" }
  | { kind: "fn"; id: string }
  | { kind: "target"; id: string }
  | { kind: "image"; id: string }
  | { kind: "part"; key: string };

export type SortKey = "address" | "size" | "name" | "status";
export type MapTab = "tiles" | "sdk";

export interface Route {
  view: View;
  /** Search words. */
  q: string;
  /** Statuses to show; none means all. */
  st: Status[];
  part: Part | "all";
  /** Browser filters on one library, one target or one group. */
  lib: string | null;
  target: string | null;
  group: string | null;
  sort: SortKey;
  dir: "asc" | "desc";
  map: MapTab;
}

export const HOME: Route = {
  view: { kind: "home" },
  q: "",
  st: [],
  part: "all",
  lib: null,
  target: null,
  group: null,
  sort: "address",
  dir: "asc",
  map: "tiles",
};

const SORTS: SortKey[] = ["address", "size", "name", "status"];
const PARTS: (Part | "all")[] = ["all", "game", "sdk", "hand"];
const MAPS: MapTab[] = ["tiles", "sdk"];
const oneOf = <T extends string>(options: readonly T[], value: string | null, fallback: T): T =>
  options.find((option) => option === value) ?? fallback;

function parseView(path: string): View {
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const [kind, ...rest] = parts;
  if (kind === "fn" && rest.length) return { kind: "fn", id: rest.join("/") };
  if (kind === "target" && rest.length) return { kind: "target", id: rest.join("/") };
  if (kind === "image" && rest.length) return { kind: "image", id: rest.join("/") };
  if ((kind === "part" || kind === "group") && rest.length) return { kind: "part", key: rest.join("/") };
  return { kind: "home" };
}

export function parseHash(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  return {
    view: parseView(path),
    q: params.get("q") ?? "",
    st: (params.get("st") ?? "").split(",").filter(isStatus),
    part: oneOf(PARTS, params.get("part"), HOME.part),
    lib: params.get("lib"),
    target: params.get("t"),
    group: params.get("g"),
    sort: oneOf(SORTS, params.get("sort"), HOME.sort),
    dir: params.get("dir") === "desc" ? "desc" : "asc",
    map: oneOf(MAPS, params.get("map"), HOME.map),
  };
}

function viewPath(view: View): string {
  switch (view.kind) {
    case "fn":
      return `fn/${encodeURIComponent(view.id)}`;
    case "target":
      return `target/${encodeURIComponent(view.id)}`;
    case "image":
      return `image/${encodeURIComponent(view.id)}`;
    case "part":
      return `part/${encodeURIComponent(view.key)}`;
    default:
      return "";
  }
}

export function formatHash(route: Route): string {
  const params = new URLSearchParams();
  if (route.q) params.set("q", route.q);
  if (route.st.length) params.set("st", route.st.join(","));
  if (route.part !== HOME.part) params.set("part", route.part);
  if (route.lib) params.set("lib", route.lib);
  if (route.target) params.set("t", route.target);
  if (route.group) params.set("g", route.group);
  if (route.sort !== HOME.sort) params.set("sort", route.sort);
  if (route.dir !== HOME.dir) params.set("dir", route.dir);
  if (route.map !== HOME.map) params.set("map", route.map);
  const query = params.toString();
  const path = viewPath(route.view);
  return path || query ? `#${path}${query ? `?${query}` : ""}` : "";
}
