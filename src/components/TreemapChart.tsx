// The function map: ECharts treemap of the model, zoomed to the node the route names.

import type { ECharts } from "echarts/core";
import { useMemo, useRef } from "preact/hooks";
import { findNode, nodeId, treemapOption, treemapTree, type MapRef } from "../charts/treemap.ts";
import { usePage } from "../state.tsx";
import { MAP } from "../strings.ts";
import { EChart, type ChartClick } from "./EChart.tsx";

interface InnerModel {
  getSeriesByIndex(index: number): { getData(): { getItemLayout(index: number): { width: number; height: number } | undefined } } | undefined;
}

interface Props {
  scope: "game" | "sdk";
  /** Id of the node to zoom to; null shows the whole scope. */
  focus: string | null;
}

export function TreemapChart({ scope, focus }: Props) {
  const { model, route, go, tokens } = usePage();
  const chart = useRef<ECharts | null>(null);
  const style = useMemo(() => ({ tokens, statuses: route.st }), [tokens, route.st]);
  const tree = useMemo(() => treemapTree(model, scope, style), [model, scope, style]);
  const option = useMemo(() => {
    const layoutOf = (index: number) => {
      // The typings keep getModel private; the instance has it.
      const model = (chart.current as unknown as { getModel(): InnerModel } | null)?.getModel();
      return model?.getSeriesByIndex(0)?.getData().getItemLayout(index);
    };
    return treemapOption(findNode(tree, focus), style, layoutOf);
  }, [tree, focus, style]);

  const open = (ref: MapRef) => {
    if (ref.kind === "fn") {
      const fn = model.functionById.get(ref.id);
      if (fn) go({ view: { kind: "fn", target: fn.target, addr: fn.addr } });
    } else if (ref.kind === "target") go({ view: { kind: "target", id: ref.id } });
    else if (ref.kind === "group") go({ view: { kind: "group", key: ref.id } });
    else go({ lib: ref.id });
  };
  const onClick = (params: ChartClick) => {
    const ref = params.data?.ref as MapRef | undefined;
    if (ref) open(ref);
  };
  const height = window.innerWidth < 700 ? 440 : 620;
  return <EChart option={option} height={height} label={scope === "game" ? MAP.gameTitle(model.game.percent.toFixed(2), model.game.done, model.game.count) : MAP.sdkTitle(model.sdk.percent.toFixed(2), model.sdk.done, model.sdk.count)} chartRef={chart} onClick={onClick} />;
}

export { nodeId };
