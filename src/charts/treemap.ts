// Game function treemaps of one part of the game or one image, sized by code bytes. Pure option
// builders; views/Treemap.tsx draws them.

import { bytes, escapeText, number } from "../model/format.ts";
import { STATUS } from "../model/status.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { Fn, Group, Target } from "../types.ts";
import type { ChartOption } from "./register.ts";

/** A zero-byte function keeps one byte of area, so it stays in the map. */
const MIN_WEIGHT = 1;

export type MapRef = { kind: "part" | "image" | "fn"; id: string };

export interface MapNode {
  id: string;
  name: string;
  value: number;
  ref: MapRef;
  tip: string;
  itemStyle?: { color: string };
  children?: MapNode[];
}

const fnTip = (fn: Fn): string =>
  [
    `<b>${escapeText(fn.name)}</b>`,
    fn.addr ? escapeText(fn.addr) : "",
    escapeText(bytes(fn.bytes)),
    escapeText(STATUS[fn.status].label),
    fn.fuzzyReported ? escapeText(`fuzzy match ${fn.fuzzy.toFixed(1)}%`) : "",
  ]
    .filter(Boolean)
    .join("<br>");

const fnNode = (fn: Fn, tokens: Tokens): MapNode => ({
  id: `f:${fn.id}`,
  name: fn.name,
  value: Math.max(fn.bytes, MIN_WEIGHT),
  ref: { kind: "fn", id: fn.unit },
  tip: fnTip(fn),
  itemStyle: { color: tokens.status[fn.status] },
});

/** One image's game functions. */
export function gameImageTree(target: Target, tokens: Tokens): MapNode {
  const children = target.functions.filter((fn) => fn.kind === "game").map((fn) =>
    fnNode(fn, tokens)
  );
  return {
    id: `image:${target.id}`,
    name: target.name,
    value: children.reduce((sum, child) => sum + child.value, 0),
    ref: { kind: "image", id: target.id },
    tip: `<b>${escapeText(target.name)}</b><br>${number(target.code.exact)} of ${
      number(target.code.functions)
    } rebuilt in C`,
    children,
  };
}

/** A part's game functions, grouped into images. */
export function gamePartTree(group: Group, tokens: Tokens): MapNode {
  const images = group.targets.map((target) => gameImageTree(target, tokens)).filter((image) =>
    image.children?.length
  );
  return {
    id: `part:${group.key}`,
    name: group.label,
    value: images.reduce((sum, image) => sum + image.value, 0),
    ref: { kind: "part", id: group.key },
    tip: "",
    children: images,
  };
}

/**
 * The option for the children of `view`. A part frames its images and leaves the functions
 * unnamed; an image names its functions. ECharts fits every label to its rectangle (it truncates
 * the text and drops lines that do not fit), so labels are right on the first paint without
 * reading the layout back.
 */
export function treemapOption(view: MapNode, tokens: Tokens): ChartOption {
  const upper = {
    show: true,
    height: 18,
    color: tokens.ink,
    fontSize: 12,
    fontWeight: "bold" as const,
  };
  const parent = {
    itemStyle: { color: "transparent", borderColor: tokens.bg, borderWidth: 2, gapWidth: 1 },
    label: { show: false },
    upperLabel: upper,
  };
  const leaf = (named: boolean) => ({
    itemStyle: { borderColor: tokens.bg, borderWidth: 1, gapWidth: 1 },
    label: { show: named },
    upperLabel: { show: false },
  });
  const hidden = {
    itemStyle: { color: "transparent", borderWidth: 0, gapWidth: 0 },
    label: { show: false },
    upperLabel: { show: false },
  };
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
        label: {
          show: true,
          color: "#ffffff",
          fontSize: 10,
          textBorderColor: "rgba(0,0,0,0.7)",
          textBorderWidth: 2,
        },
        upperLabel: upper,
        // Depth 0 is the hidden root.
        levels: view.ref.kind === "part" ? [hidden, parent, leaf(false)] : [hidden, leaf(true)],
        data: view.children,
      },
    ],
  };
}
