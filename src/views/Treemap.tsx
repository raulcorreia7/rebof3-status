// The PsyQ SDK map: the ECharts treemap of the selector's tree, zoomed to the library the route names.

import { createMemo, createSignal, For, onCleanup, onMount, type Accessor } from "solid-js";
import type { ChartOption } from "../charts/register.ts";
import { findNode, treemapOption, type MapNode, type MapRef } from "../charts/treemap.ts";
import { usePage } from "../state.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { Views } from "../viewtypes.ts";
import { Chart, type ChartClick } from "./Chart.tsx";

export function Treemap(props: { data: Accessor<Views["treemap"]> }) {
  const page = usePage();
  return (
    <>
      <nav class="mt-2 mb-1 text-sm" aria-label="Map zoom">
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
      <Canvas data={props.data} />
    </>
  );
}

function Canvas(props: { data: Accessor<Views["treemap"]> }) {
  const page = usePage();
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
    const data = props.data();
    const view = findNode(data.tree, data.focus);
    const tokens = page.tokens;
    if (built && built.view === view && built.tokens === tokens) return built.option;
    built = { view, tokens, option: treemapOption(view, tokens) };
    return built.option;
  });
  const onClick = (params: ChartClick) => {
    const ref = params.data?.ref as MapRef | undefined;
    if (ref?.kind === "fn") page.go({ view: { kind: "fn", id: ref.id } });
    else if (ref) page.go({ lib: ref.id });
  };
  return <Chart option={option()} height={window.innerWidth < 700 ? 440 : 620} label={props.data().label} onClick={onClick} crossfade={!calm()} replace />;
}
