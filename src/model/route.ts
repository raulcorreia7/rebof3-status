// The page state that a link carries, kept in the URL hash so every view is shareable.

//   #fn/exe%2Fslus_004_22%2Ffunc_8015AD00                 the home page with a function open
//   #image/emi%2Fworld00%2Farea037%2F13                   an image page (its treemap)
//   #image/emi%2Fworld00%2Farea037%2F13?fn=...            the same with a function open
//   #part/battle                                          a part of the game page
//   #?q=cure&st=pure,open&sort=size                       function list filters
//   #map, #browse, ...                                    a section of the home page
//
// Older links still open: #target/<id> is the image page, #group/<key> the part page.

// A parameter that holds its default value is left out of the hash.

import type { Part, Status } from "../types.ts";
import { isStatus } from "./status.ts";

/** The page: home (the sections), one part of the game, or one image. */
export type View = { kind: "home" } | { kind: "image"; id: string } | { kind: "part"; key: string };

export type SortKey = "address" | "size" | "name" | "status";

export interface Route {
  view: View;
  /** The function open in the side panel. */
  fn: string | null;
  /** Search words. */
  q: string;
  /** Statuses to show; none means all. */
  st: Status[];
  part: Part | "all";
  /** Function list filters on one library or one image. */
  lib: string | null;
  target: string | null;
  sort: SortKey;
  dir: "asc" | "desc";
}

export const HOME: Route = {
  view: { kind: "home" },
  fn: null,
  q: "",
  st: [],
  part: "all",
  lib: null,
  target: null,
  sort: "address",
  dir: "asc",
};

const SORTS: SortKey[] = ["address", "size", "name", "status"];
const PARTS: (Part | "all")[] = ["all", "game", "sdk", "hand"];
const oneOf = <T extends string>(options: readonly T[], value: string | null, fallback: T): T =>
  options.find((option) => option === value) ?? fallback;

/** A path that older pages wrote; parseHash reads it, formatHash never writes it. */
export const isLegacyPath = (hash: string): boolean => /^#(target|group)\//.test(hash);

export function parseHash(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const [kind, ...rest] = path.split("/").filter(Boolean).map(decodeURIComponent);
  const id = rest.join("/");
  const view: View =
    id && (kind === "image" || kind === "target") ? { kind: "image", id } : id && (kind === "part" || kind === "group") ? { kind: "part", key: id } : { kind: "home" };
  return {
    view,
    fn: kind === "fn" && id ? id : params.get("fn"),
    q: params.get("q") ?? "",
    st: (params.get("st") ?? "").split(",").filter(isStatus),
    part: oneOf(PARTS, params.get("part"), HOME.part),
    lib: params.get("lib"),
    target: params.get("t"),
    sort: oneOf(SORTS, params.get("sort"), HOME.sort),
    dir: params.get("dir") === "desc" ? "desc" : "asc",
  };
}

/** The path of a page, without the query: two routes on the same page share it. */
export function pagePath(view: View): string {
  if (view.kind === "image") return `image/${encodeURIComponent(view.id)}`;
  if (view.kind === "part") return `part/${encodeURIComponent(view.key)}`;
  return "";
}

export function formatHash(route: Route): string {
  const params = new URLSearchParams();
  const page = pagePath(route.view);
  // On the home page an open function is the path, as links have always been.
  const path = page || (route.fn ? `fn/${encodeURIComponent(route.fn)}` : "");
  if (page && route.fn) params.set("fn", route.fn);
  if (route.q) params.set("q", route.q);
  if (route.st.length) params.set("st", route.st.join(","));
  if (route.part !== HOME.part) params.set("part", route.part);
  if (route.lib) params.set("lib", route.lib);
  if (route.target) params.set("t", route.target);
  if (route.sort !== HOME.sort) params.set("sort", route.sort);
  if (route.dir !== HOME.dir) params.set("dir", route.dir);
  const query = params.toString();
  return path || query ? `#${path}${query ? `?${query}` : ""}` : "";
}
