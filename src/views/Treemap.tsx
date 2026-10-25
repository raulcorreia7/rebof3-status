// The function map: the ECharts treemap of the selector's tree, zoomed to the node the route names.

import type { ECharts } from "echarts/core";
import { createMemo, createSignal, For, onCleanup, onMount, type Accessor } from "solid-js";
import type { ChartOption } from "../charts/register.ts";
import { findNode, treemapOption, type MapNode, type MapRef } from "../charts/treemap.ts";
import { usePage } from "../state.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { Views } from "../viewtypes.ts";
import { Chart, type ChartClick } from "./Chart.tsx";

interface InnerModel {
  getSeriesByIndex(index: number): InnerSeries | undefined;
}

interface InnerSeries {
  getData(): { getItemLayout(index: number): { width: number; height: number } | undefined };
}

// ECharts keeps getModel on the instance but out of the public typings.
const modelOf = (chart: ECharts): InnerModel | undefined => {
  const internal = chart as unknown as { getModel?: () => InnerModel };
  return typeof internal.getModel === "function" ? internal.getModel() : undefined;
};

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
      {/* One instance across both scopes: a scope change updates the option, it does not remount. */}
      <Canvas data={props.data} />
    </>
  );
}

function Canvas(props: { data: Accessor<Views["treemap"]> }) {
  const page = usePage();
  let chart: ECharts | null = null;
  // Honour the system setting, including a change made while the page is open.
  const [calm, setCalm] = createSignal(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  onMount(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCalm(query.matches);
    query.addEventListener("change", update);
    onCleanup(() => query.removeEventListener("change", update));
  });
  // Keep the option object stable when a route change (a function selection, say) leaves the
  // map unchanged, so Chart does not redraw it.
  let built: { view: MapNode; tokens: Tokens; option: ChartOption } | undefined;
  const option = createMemo(() => {
    const layoutOf = (index: number) => (chart ? modelOf(chart)?.getSeriesByIndex(0)?.getData().getItemLayout(index) : undefined);
    const data = props.data();
    const view = findNode(data.tree, data.focus);
    const tokens = page.tokens;
    if (built && built.view === view && built.tokens === tokens) return built.option;
    const next = treemapOption(view, { tokens }, layoutOf);
    built = { view, tokens, option: next };
    return next;
  });
  const open = (ref: MapRef) => {
    if (ref.kind === "fn") {
      const fn = page.model.functionById.get(ref.id);
      if (fn) page.go({ view: { kind: "fn", id: fn.id } });
    } else if (ref.kind === "target") page.go({ view: { kind: "target", id: ref.id } });
    else if (ref.kind === "group") page.go({ view: { kind: "group", key: ref.id } });
    else page.go({ lib: ref.id });
  };
  const onClick = (params: ChartClick) => {
    const ref = params.data?.ref as MapRef | undefined;
    if (ref) open(ref);
  };
  return (
    <Chart
      option={option()}
      height={window.innerWidth < 700 ? 440 : 620}
      label={props.data().label}
      onClick={onClick}
      crossfade={!calm()}
      replace
      onChart={(next) => (chart = next)}
    />
  );
}
