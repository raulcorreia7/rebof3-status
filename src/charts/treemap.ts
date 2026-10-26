// The PsyQ SDK and the game: treemaps of libraries or game functions, sized by code bytes.
// Pure option builders; views/Treemap.tsx draws them.

import { TIER_LABEL } from "../strings.ts";
import { STATUS } from "../model/status.ts";
import type { Fn, Group, Model, Status, Target } from "../types.ts";
import { bytes, escapeText, number, percent } from "../model/format.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { ChartOption } from "./register.ts";


/** SDK stubs keep a small visible area; game functions use one byte only for zero-sized rows. */
const MIN_BYTES = 64;
const MIN_GAME_WEIGHT = 1;

export type MapRef = { kind: "library" | "part" | "image" | "fn"; id: string };


export interface MapNode {
  id: string;
  name: string;
  value: number;
  ref: MapRef;
  tip: string;
  itemStyle?: { color: string };
  children?: MapNode[];
}

const nodeId = ({ kind, id }: MapRef): string => `${kind[0]}:${id}`;
const ROOT_ID = "root";

interface MapStyle {
  tokens: Tokens;
  /** Statuses to light up; none means all. The rest are dimmed. */
  statuses: Status[];
}

const fnTip = (fn: Fn): string =>
  [
    `<b>${escapeText(fn.name)}</b>`,
    `Address: ${escapeText(fn.addr || "not in unit name")}`,
    `Size: ${escapeText(bytes(fn.bytes))}`,
    `Status: ${escapeText(STATUS[fn.status].label)}`,
    fn.fuzzyReported ? `Fuzzy match: ${escapeText(`${fn.fuzzy.toFixed(1)}%`)}` : "",
  ]
    .filter(Boolean)
    .join("<br>");

function fnNode(fn: Fn, { tokens, statuses }: MapStyle, minimumWeight = MIN_BYTES): MapNode {
  const lit = !statuses.length || statuses.includes(fn.status);
  return {
    id: nodeId({ kind: "fn", id: fn.id }),
    name: fn.name,
    value: Math.max(fn.bytes, minimumWeight),
    ref: { kind: "fn", id: fn.id },
    tip: fnTip(fn),
    itemStyle: { color: lit ? tokens.status[fn.status] : tokens.track },
  };
}
/** A part's game functions, grouped into images. */
export function gamePartTree(group: Group, tokens: Tokens): MapNode {
  const images = group.targets
    .map((target) => {
      const children = target.functions
        .filter((fn) => fn.kind === "game")
        .map((fn) => fnNode(fn, { tokens, statuses: [] }, MIN_GAME_WEIGHT));
      return {
        id: nodeId({ kind: "image", id: target.id }),
        name: target.name,
        value: children.reduce((sum, child) => sum + child.value, 0),
        ref: { kind: "image" as const, id: target.id },
        tip: `<b>${escapeText(target.name)}</b><br>${number(target.code.functions)} game functions · ${escapeText(bytes(target.code.bytes))} from status.json`,
        children,
      };
    })
    .filter((image) => image.children.length);
  return {
    id: `part:${group.key}`,
    name: group.label,
    value: images.reduce((sum, image) => sum + image.value, 0),
    ref: { kind: "part", id: group.key },
    tip: "",
    children: images,
  };
}

export function gameImageTree(target: Target, tokens: Tokens): MapNode {
  const children = target.functions
    .filter((fn) => fn.kind === "game")
    .map((fn) => fnNode(fn, { tokens, statuses: [] }, MIN_GAME_WEIGHT));
  return {
    id: `image:${target.id}`,
    name: target.name,
    value: children.reduce((sum, child) => sum + child.value, 0),
    ref: { kind: "image", id: target.id },
    tip: `<b>${escapeText(target.name)}</b><br>${number(target.code.functions)} game functions · ${escapeText(bytes(target.code.bytes))} from status.json`,
    children,
  };
}

/** The last tree; a route change that does not change the map must not rebuild it. */
let cached: { model: Model; tokens: Tokens; statuses: string; tree: MapNode } | null = null;

/** The PsyQ SDK by library. */
export function treemapTree(model: Model, style: MapStyle): MapNode {
  const statuses = style.statuses.join(",");
  if (cached && cached.model === model && cached.tokens === style.tokens && cached.statuses === statuses) return cached.tree;
  const children: MapNode[] = model.libraries.map((lib) => {
    const leaves = lib.functions.map((fn) => fnNode(fn, style));
    return {
      id: nodeId({ kind: "library", id: lib.name }),
      name: lib.name,
      value: leaves.reduce((sum, leaf) => sum + leaf.value, 0),
      ref: { kind: "library", id: lib.name },
      tip: `<b>${escapeText(lib.name)}</b><br>${number(lib.done)} of ${number(lib.count)} functions done (${percent(lib.done, lib.count, 1)}%)`,
      children: leaves,
    };
  });
  const tree: MapNode = {
    id: ROOT_ID,
    name: "sdk",
    value: children.reduce((sum, child) => sum + child.value, 0),
    ref: { kind: "library", id: ROOT_ID },
    tip: "",
    children: children.filter((child) => child.value > 0),
  };
  cached = { model, tokens: style.tokens, statuses, tree };
  return tree;
}

/** The library with `id`, or the root. */
export function findNode(root: MapNode, id: string | null): MapNode {
  return root.children?.find((node) => node.id === id) ?? root;
}

/**
 * The option for the children of `view`: the root or one library. ECharts fits every label to its
 * rectangle (it truncates the text and drops lines that do not fit), so labels are right on the
 * first paint without reading the layout back.
 */
export function treemapOption(view: MapNode, tokens: Tokens): ChartOption {
  const upper = { show: true, height: 18, color: tokens.ink, fontSize: 12, fontWeight: "bold" as const };
  const parent = { itemStyle: { color: "transparent", borderColor: tokens.bg, borderWidth: 2, gapWidth: 1 }, label: { show: false }, upperLabel: upper };
  const leaf = (named: boolean) => ({ itemStyle: { borderColor: tokens.bg, borderWidth: 1, gapWidth: 1 }, label: { show: named }, upperLabel: { show: false } });
  const hidden = { itemStyle: { color: "transparent", borderWidth: 0, gapWidth: 0 }, label: { show: false }, upperLabel: { show: false } };
  return {
    animation: false,
    tooltip: {
      confine: true,
      backgroundColor: tokens.card,
      borderColor: tokens.line,
      textStyle: { color: tokens.ink, fontSize: 12 },
      formatter: (params: { data?: { tip?: string } }) => params.data?.tip ?? "",
    },
    series: [
      {
        type: "treemap",
        // The treemap series defaults to a 900 ms quinticInOut update, ignoring the
        // top-level `animation: false`. The drill transition is the chart's canvas crossfade
        // (views/Chart.tsx), so every layout update snaps.
        animation: false,
        animationDuration: 0,
        animationDurationUpdate: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        squareRatio: 1,
        label: { show: true, color: "#ffffff", fontSize: 10, textBorderColor: "rgba(0,0,0,0.7)", textBorderWidth: 2 },
        upperLabel: upper,
        // Depth 0 is the hidden root. At the top each library frames its functions, which are too
        // small to name; zoomed into one library, the functions are named.
        levels: view.ref.kind === "part" ? [hidden, parent, leaf(true)] : view.id === ROOT_ID ? [hidden, parent, leaf(false)] : [hidden, leaf(true)],
        data: view.children,
      },
    ],
  };
}
