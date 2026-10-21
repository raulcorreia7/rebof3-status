// The page state that a link carries, kept in the URL hash so a view can be shared.
//
//   #fn/exe/slus_004_22/0x8015AD00   open a function in the inspector
//   #target/emi/world00/area030/04   open a target and zoom the map to it
//   #group/emi/battle                zoom the map to a group
//   #?q=cure&st=pure,open&sort=size  function browser filters
//
// A parameter that holds its default value is left out of the hash.

import type { Status } from "../types.ts";
import { isStatus } from "./status.ts";

export type View =
  | { kind: "home" }
  | { kind: "fn"; target: string; addr: string }
  | { kind: "target"; id: string }
  | { kind: "group"; key: string };

export type Part = "all" | "game" | "sdk";
export type SortKey = "address" | "size" | "name" | "status";
export type MapTab = "tiles" | "sdk" | "strips";

export interface Route {
  view: View;
  /** Search words. */
  q: string;
  /** Statuses to show; none means all. */
  st: Status[];
  part: Part;
  /** Browser filters on one library, one target or one group. */
  lib: string | null;
  target: string | null;
  group: string | null;
  sort: SortKey;
  dir: "asc" | "desc";
  map: MapTab;
  /** Strips show the reserved space instead of hiding it. */
  reserved: boolean;
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
  reserved: false,
};

const SORTS: SortKey[] = ["address", "size", "name", "status"];
const PARTS: Part[] = ["all", "game", "sdk"];
const MAPS: MapTab[] = ["tiles", "sdk", "strips"];
const oneOf = <T extends string>(options: readonly T[], value: string | null, fallback: T): T =>
  options.find((option) => option === value) ?? fallback;

function parseView(path: string): View {
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const [kind, ...rest] = parts;
  if (kind === "fn" && rest.length >= 2) return { kind: "fn", target: rest.slice(0, -1).join("/"), addr: rest[rest.length - 1] };
  if (kind === "target" && rest.length) return { kind: "target", id: rest.join("/") };
  if (kind === "group" && rest.length) return { kind: "group", key: rest.join("/") };
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
    reserved: params.get("reserved") === "1",
  };
}

function viewPath(view: View): string {
  const encode = (text: string) => text.split("/").map(encodeURIComponent).join("/");
  switch (view.kind) {
    case "fn":
      return `fn/${encode(view.target)}/${encodeURIComponent(view.addr)}`;
    case "target":
      return `target/${encode(view.id)}`;
    case "group":
      return `group/${encode(view.key)}`;
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
  if (route.reserved) params.set("reserved", "1");
  const query = params.toString();
  const path = viewPath(route.view);
  return path || query ? `#${path}${query ? `?${query}` : ""}` : "";
}
