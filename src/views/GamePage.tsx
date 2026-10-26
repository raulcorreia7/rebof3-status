// A part of the game or an image: its counts, then its functions as a treemap and a list.
// ECharts draws every function on canvas; the list beside it holds the same functions as links,
// paged so a large part never creates one DOM node per function.

import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show, type Accessor } from "solid-js";
import type { ChartOption } from "../charts/register.ts";
import { treemapOption, type MapNode, type MapRef } from "../charts/treemap.ts";
import { PAGE_STEP } from "../model/browse.ts";
import { bytes } from "../model/format.ts";
import { MAP } from "../strings.ts";
import { usePage } from "../state.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { GamePage } from "../viewtypes.ts";
import { Chart, type ChartClick } from "./Chart.tsx";
import { Jump, Meter, StatusChip, StatusKey } from "./ui.tsx";

export function GamePageView(props: { data: Accessor<GamePage> }) {
  let heading: HTMLHeadingElement | undefined;
  // A new page takes the focus to its heading, as a page load would.
  createEffect(on(() => props.data().title, () => heading?.focus({ preventScroll: true })));
  return (
    <section class="mt-6" aria-labelledby="page-title">
      <Crumbs data={props.data} />
      <div class="mt-1 flex flex-wrap items-baseline gap-x-3">
        <h2 id="page-title" ref={heading} tabIndex={-1} class="text-xl font-semibold break-words focus:outline-none">
          {props.data().title}
        </h2>
        <span class="text-2xl font-bold tabular-nums">{props.data().percent}</span>
        <span class="text-sm text-mute tabular-nums">{props.data().line}</span>
      </div>
      <Show when={props.data().message}>{(message) => <p class="my-2">{message()}</p>}</Show>
      <Show when={props.data().note}>{(note) => <p class="text-sm text-mute">{note()}</p>}</Show>
      <Show when={props.data().meter}>{(meter) => <Meter row={meter()} class="my-2 h-3.5" />}</Show>
      <Show when={props.data().found}>
        <StatusKey items={props.data().key} />
      </Show>
      <Show when={props.data().tree}>{(tree) => <Functions data={props.data} tree={tree} />}</Show>
    </section>
  );
}

function Crumbs(props: { data: Accessor<GamePage> }) {
  const last = () => props.data().crumbs.length - 1;
  return (
    <nav class="text-sm" aria-label={MAP.crumbs}>
      <For each={props.data().crumbs}>
        {(crumb, index) => (
          <>
            {index() > 0 ? <span class="text-mute" aria-hidden="true"> › </span> : null}
            {index() < last() ? (
              <Jump to={crumb.to} scroll={crumb.scroll}>
                {crumb.label}
              </Jump>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </>
        )}
      </For>
    </nav>
  );
}

function Functions(props: { data: Accessor<GamePage>; tree: Accessor<MapNode> }) {
  const page = usePage();
  const [limit, setLimit] = createSignal(PAGE_STEP);
  const visible = () => props.data().functions.slice(0, limit());
  createEffect(on(() => props.data().title, () => setLimit(PAGE_STEP), { defer: true }));
  const heading = () => MAP.listHeading(props.data().functions.length);

  return (
    <div class="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div class="min-w-0">
        <Canvas tree={props.tree} label={MAP.chartLabel(props.data().title, props.data().functions.length)} />
      </div>
      <section class="card min-w-0 p-3" aria-label={heading()}>
        <h3 class="font-semibold">{heading()}</h3>
        <Show when={props.data().functions.length} fallback={<p class="mt-2 text-sm text-mute">{MAP.listEmpty}</p>}>
          <ul class="mt-2 max-h-[32rem] space-y-1 overflow-y-auto">
            <For each={visible()}>
              {(fn) => (
                <li>
                  <Jump
                    to={{ fn: fn.id }}
                    class={`block rounded border px-2 py-1.5 text-ink hover:border-accent hover:no-underline ${page.route.fn === fn.id ? "border-accent bg-track" : "border-line bg-card"}`}
                    aria-current={page.route.fn === fn.id}
                  >
                    <span class="flex justify-between gap-2">
                      <b class="min-w-0 truncate">{fn.name}</b>
                      <span class="text-xs whitespace-nowrap text-mute">{bytes(fn.bytes)}</span>
                    </span>
                    <span class="flex flex-wrap items-center justify-between gap-x-2 text-xs text-mute">
                      <span>
                        <code>{fn.addr}</code>
                        <Show when={props.data().inPart}> · {page.model.targetById.get(fn.target)?.name}</Show>
                      </span>
                      <StatusChip status={fn.status} />
                    </span>
                  </Jump>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={props.data().functions.length > limit()}>
          <button type="button" class="link mt-2" onClick={() => setLimit(limit() + PAGE_STEP)}>
            {MAP.showMore(Math.min(PAGE_STEP, props.data().functions.length - limit()))}
          </button>
        </Show>
      </section>
    </div>
  );
}

function Canvas(props: { tree: Accessor<MapNode>; label: string }) {
  const page = usePage();
  // Honour the system setting, including a change made while the page is open.
  const [calm, setCalm] = createSignal(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  onMount(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCalm(query.matches);
    query.addEventListener("change", update);
    onCleanup(() => query.removeEventListener("change", update));
  });
  // Keep the option object stable when a route change (an open function) leaves the map unchanged.
  let built: { view: MapNode; tokens: Tokens; option: ChartOption } | undefined;
  const option = createMemo(() => {
    const view = props.tree();
    const tokens = page.tokens;
    if (built && built.view.id === view.id && built.tokens === tokens) return built.option;
    built = { view, tokens, option: treemapOption(view, tokens) };
    return built.option;
  });
  const onClick = (params: ChartClick) => {
    const ref = params.data?.ref as MapRef | undefined;
    if (ref?.kind === "fn") page.go({ fn: ref.id });
    else if (ref?.kind === "image") page.go({ view: { kind: "image", id: ref.id }, fn: null });
  };
  return <Chart option={option()} height={window.innerWidth < 700 ? 420 : 620} label={props.label} onClick={onClick} crossfade={!calm()} replace />;
}
