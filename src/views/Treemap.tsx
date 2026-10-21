// The function map: the ECharts treemap of the selector's tree, zoomed to the node the route names.

import type { ECharts } from "echarts/core";
import { createMemo, For, Show, type Accessor } from "solid-js";
import { findNode, treemapOption, type MapRef } from "../charts/treemap.ts";
import { usePage } from "../state.ts";
import type { Views } from "../viewtypes.ts";
import { Chart, type ChartClick } from "./Chart.tsx";

interface InnerModel {
  getSeriesByIndex(index: number): { getData(): { getItemLayout(index: number): { width: number; height: number } | undefined } } | undefined;
}

export function Treemap(props: { data: Accessor<Views["treemap"]> }) {
  const page = usePage();
  return (
    <>
      <nav class="crumbs" aria-label="Map zoom">
        <For each={props.data().crumbs}>
          {(crumb, index) => (
            <span>
              {index() > 0 ? <span aria-hidden="true"> › </span> : null}
              {index() < props.data().crumbs.length - 1 ? (
                <button type="button" class="link" onClick={() => page.go(crumb.to)}>
                  {crumb.label}
                </button>
              ) : (
                <b aria-current="location">{crumb.label}</b>
              )}
            </span>
          )}
        </For>
      </nav>
      {/* A new scope draws a new chart. */}
      <Show when={props.data().scope} keyed>
        {(scope) => <Canvas data={props.data} scope={scope} />}
      </Show>
    </>
  );
}

function Canvas(props: { data: Accessor<Views["treemap"]>; scope: string }) {
  const page = usePage();
  let chart: ECharts | null = null;
  const option = createMemo(() => {
    const layoutOf = (index: number) => {
      // The typings keep getModel private; the instance has it.
      const inner = (chart as unknown as { getModel(): InnerModel } | null)?.getModel();
      return inner?.getSeriesByIndex(0)?.getData().getItemLayout(index);
    };
    return treemapOption(findNode(props.data().tree, props.data().focus), { tokens: page.tokens, statuses: page.route.st }, layoutOf);
  });
  const open = (ref: MapRef) => {
    if (ref.kind === "fn") {
      const fn = page.model.functionById.get(ref.id);
      if (fn) page.go({ view: { kind: "fn", target: fn.target, addr: fn.addr } });
    } else if (ref.kind === "target") page.go({ view: { kind: "target", id: ref.id } });
    else if (ref.kind === "group") page.go({ view: { kind: "group", key: ref.id } });
    else page.go({ lib: ref.id });
  };
  const onClick = (params: ChartClick) => {
    const ref = params.data?.ref as MapRef | undefined;
    if (ref) open(ref);
  };
  return <Chart option={option()} height={window.innerWidth < 700 ? 440 : 620} label={props.data().label} onClick={onClick} onChart={(instance) => (chart = instance)} />;
}
