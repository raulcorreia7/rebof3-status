// The function map: a treemap of groups > targets > functions (or libraries > functions), sized
// by code bytes and coloured by status. Pure option builders; components/TreemapChart.tsx draws them.

import { STATUS_LABEL, TIER_LABEL } from "../strings.ts";
import type { Fn, Model, Status } from "../types.ts";
import { escapeText, number, percent } from "../model/format.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { ChartOption } from "./register.ts";

/** A function counts for at least this many bytes so a stub still gets a visible rectangle. */
const MIN_BYTES = 64;

export type MapRef = { kind: "group" | "target" | "library" | "fn"; id: string };

export interface MapNode {
  id: string;
  name: string;
  value: number;
  ref: MapRef;
  tip: string;
  itemStyle?: { color: string };
  children?: MapNode[];
}

export const nodeId = ({ kind, id }: MapRef): string => `${kind[0]}:${id}`;
export const ROOT_ID = "root";

export interface MapStyle {
  tokens: Tokens;
  /** Statuses to light up; none means all. The rest are dimmed. */
  statuses: Status[];
}

const fnTip = (fn: Fn): string => {
  const tier = fn.tier ? ` · ${escapeText(TIER_LABEL[fn.tier])}${fn.version ? ` (PsyQ ${escapeText(fn.version)})` : ""}` : "";
  return `<b>${escapeText(fn.name)}</b><br>${escapeText(fn.id)}<br>${escapeText(STATUS_LABEL[fn.status])}${tier} · ${number(fn.bytes)} B`;
};

function fnNode(fn: Fn, { tokens, statuses }: MapStyle): MapNode {
  const lit = !statuses.length || statuses.includes(fn.status);
  return {
    id: nodeId({ kind: "fn", id: fn.id }),
    name: fn.name,
    value: Math.max(fn.bytes, MIN_BYTES),
    ref: { kind: "fn", id: fn.id },
    tip: fnTip(fn),
    itemStyle: { color: lit ? tokens.status[fn.status] : tokens.track },
  };
}

function parentNode(ref: MapRef, name: string, functions: Fn[], done: number, style: MapStyle): MapNode {
  const children = functions.map((fn) => fnNode(fn, style));
  return {
    id: nodeId(ref),
    name,
    value: children.reduce((sum, child) => sum + child.value, 0),
    ref,
    tip: `<b>${escapeText(name)}</b><br>${number(done)} of ${number(functions.length)} functions done (${percent(done, functions.length, 1)}%)`,
    children,
  };
}

/** The tree for one scope: game code by group and target, or the PsyQ SDK by library. */
export function treemapTree(model: Model, scope: "game" | "sdk", style: MapStyle): MapNode {
  const children: MapNode[] =
    scope === "game"
      ? model.groups.map((group) => {
          const targets = group.targets
            .filter((target) => target.game.count)
            .map((target) => parentNode({ kind: "target", id: target.id }, target.name, target.functions.filter((fn) => fn.kind === "game"), target.game.done, style));
          return {
            id: nodeId({ kind: "group", id: group.key }),
            name: group.label,
            value: targets.reduce((sum, target) => sum + target.value, 0),
            ref: { kind: "group", id: group.key },
            tip: `<b>${escapeText(group.label)}</b><br>${number(group.done)} of ${number(group.count)} functions matched (${percent(group.done, group.count, 1)}%)`,
            children: targets,
          };
        })
      : model.libraries.map((lib) => parentNode({ kind: "library", id: lib.name }, lib.name, lib.functions, lib.done, style));
  return {
    id: ROOT_ID,
    name: scope,
    value: children.reduce((sum, child) => sum + child.value, 0),
    ref: { kind: "group", id: ROOT_ID },
    tip: "",
    children: children.filter((child) => child.value > 0),
  };
}

/** Size of a drawn rectangle, so labels only appear where they fit. */
export type LayoutOf = (dataIndex: number) => { width: number; height: number } | undefined;

// Text width in pixels at `size`, a rough estimate that errs on the wide side.
const textWidth = (text: string, size: number): number => text.length * size * 0.62;

/** The node with `id` in the tree, or the root. */
export function findNode(root: MapNode, id: string | null): MapNode {
  if (!id || id === root.id) return root;
  const stack = [...(root.children ?? [])];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.id === id) return node;
    if (node.children) stack.push(...node.children);
  }
  return root;
}

const depthBelow = (node: MapNode): number => (node.children?.length ? 1 + depthBelow(node.children[0]) : 0);

/** The option for the children of `view`, which is the root or any node that was zoomed to. */
export function treemapOption(view: MapNode, { tokens }: MapStyle, layoutOf: LayoutOf): ChartOption {
  const fits = (dataIndex: number, name: string, size: number): boolean => {
    const box = layoutOf(dataIndex);
    return !!box && box.width >= textWidth(name, size) + 8 && box.height >= size + 6;
  };
  const upper = { show: true, height: 18, color: tokens.ink, fontSize: 12, fontWeight: "bold" as const, overflow: "truncate" as const };
  const parent = { itemStyle: { color: "transparent", borderColor: tokens.bg, borderWidth: 2, gapWidth: 1 }, label: { show: false }, upperLabel: upper };
  const leaf = { itemStyle: { borderColor: tokens.bg, borderWidth: 1, gapWidth: 1 }, label: { show: true }, upperLabel: { show: false } };
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
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        squareRatio: 1,
        label: {
          show: true,
          color: "#ffffff",
          fontSize: 10,
          textBorderColor: "rgba(0,0,0,0.7)",
          textBorderWidth: 2,
          overflow: "truncate",
          formatter: (p: { dataIndex: number; data: { name: string } }) => (fits(p.dataIndex, p.data.name, 10) ? p.data.name : ""),
        },
        upperLabel: upper,
        // Depth 0 is the hidden root; every level below it up to the functions is a framed block.
        levels: [hidden, ...Array.from({ length: depthBelow(view) - 1 }, () => parent), leaf],
        data: view.children,
      },
    ],
  };
}
