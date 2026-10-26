// The PsyQ library map and the game-code treemaps. ECharts draws every function on canvas; the
// game function list is paged so a large part never creates one DOM node per function.

import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show, type Accessor } from "solid-js";
import type { ChartOption } from "../charts/register.ts";
import { findNode, treemapOption, type MapNode, type MapRef } from "../charts/treemap.ts";
import { PAGE_STEP } from "../model/browse.ts";
import { bytes } from "../model/format.ts";
import { HOME } from "../model/route.ts";
import { STATUS } from "../model/status.ts";
import { MAP } from "../strings.ts";
import { usePage } from "../state.ts";
import type { Tokens } from "../theme/tokens.ts";
import type { Fn } from "../types.ts";
import type { Views } from "../viewtypes.ts";
import { Chart, type ChartClick } from "./Chart.tsx";
import { Chip, StatusChip } from "./ui.tsx";

type GameView = Extract<Views["treemap"], { kind: "game" }>;
const GAME_STATUSES = ["pure", "nonmatching", "open"] as const;

export function Treemap(props: { data: Accessor<Views["treemap"]> }) {
  const game = createMemo(() => {
    const data = props.data();
    return data.kind === "game" ? data : null;
  });
  return (
    <Show when={game()} fallback={<SdkTreemap data={props.data} />}>
      {(data) => <GameTreemap data={data} />}
    </Show>
  );
}

function SdkTreemap(props: { data: Accessor<Views["treemap"]> }) {
  return (
    <>
      <Crumbs data={props.data} />
      <Canvas data={props.data} />
    </>
  );
}

function GameTreemap(props: { data: Accessor<GameView> }) {
  const page = usePage();
  return (
    <section class="mt-6" aria-labelledby="treemap-title">
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="btn" onClick={() => page.go(HOME)}>
          {MAP.back}
        </button>
        <h2 id="treemap-title" class="text-xl font-semibold break-words">{props.data().title}</h2>
      </div>
      <Crumbs data={props.data} />
      <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <For each={GAME_STATUSES}>
          {(status) => (
            <span class="inline-flex items-center">
              <Chip color={STATUS[status].color} />
              {STATUS[status].label}
            </span>
          )}
        </For>
      </div>
      <p class="my-1 text-sm text-mute">{MAP.statusHelp}</p>
      <p class="my-1 text-sm text-mute">{MAP.functionSource}</p>
      <p class="my-1 text-sm tabular-nums">{MAP.scopeSummary(props.data().censusFunctions, props.data().censusBytes, props.data().functions.length, props.data().reportBytes)}</p>
      <p class="my-1 text-sm text-mute">{MAP.coverage(props.data().functions.length, props.data().censusFunctions, props.data().reportBytes, props.data().censusBytes)}</p>
      <GameFunctions data={props.data} />
    </section>
  );
}

function Crumbs(props: { data: Accessor<Views["treemap"]> }) {
  const page = usePage();
  return (
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
  );
}

function GameFunctions(props: { data: Accessor<GameView> }) {
  const page = usePage();
  const [limit, setLimit] = createSignal(PAGE_STEP);
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const selected = () => props.data().functions.find((fn) => fn.id === selectedId()) ?? null;
  const visible = () => props.data().functions.slice(0, limit());

  createEffect(
    on(
      () => props.data().scopeId,
      () => {
        setLimit(PAGE_STEP);
        setSelectedId(null);
      },
      { defer: true },
    ),
  );

  return (
    <div class="mt-3 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div class="min-w-0">
        <Canvas data={props.data} onFunction={(id) => setSelectedId(id)} />
      </div>
      <aside class="card min-w-0 p-3" aria-label={MAP.functionHeading(props.data().functions.length)}>
        <h3 class="font-semibold">{MAP.functionHeading(props.data().functions.length)}</h3>
        <Show when={selected()}>{(fn) => <FunctionDetails fn={fn()} />}</Show>
        <Show when={props.data().functions.length} fallback={<p class="mt-2 text-sm text-mute">{MAP.listEmpty}</p>}>
          <ul class="mt-2 max-h-[32rem] space-y-1 overflow-y-auto" aria-label={MAP.functionHeading(props.data().functions.length)}>
            <For each={visible()}>
              {(fn) => (
                <li>
                  <button
                    type="button"
                    class={`block w-full rounded border border-line px-2 py-1.5 text-left hover:border-accent ${selectedId() === fn.id ? "bg-track" : "bg-card"}`}
                    aria-label={`${fn.name}, ${fn.addr || "address unavailable"}, ${bytes(fn.bytes)}, ${STATUS[fn.status].label}${fn.fuzzyReported ? `, fuzzy match ${fn.fuzzy.toFixed(1)}%` : ""}`}
                    aria-pressed={selectedId() === fn.id}
                    onClick={() => setSelectedId(fn.id)}
                  >
                    <span class="flex justify-between gap-2">
                      <b class="min-w-0 truncate">{fn.name}</b>
                      <span class="whitespace-nowrap text-xs text-mute">{bytes(fn.bytes)}</span>
                    </span>
                    <Show when={props.data().scopeId.startsWith("part:")}>
                      <span class="block truncate text-xs text-mute">{page.model.targetById.get(fn.target)?.name ?? fn.target}</span>
                    </Show>
                    <span class="flex flex-wrap items-center justify-between gap-x-2 text-xs text-mute">
                      <code>{fn.addr || "address unavailable"}</code>
                      <StatusChip status={fn.status} />
                    </span>
                    <Show when={fn.fuzzyReported}>
                      <span class="block text-xs text-mute">{MAP.fields.fuzzy}: {fn.fuzzy.toFixed(1)}%</span>
                    </Show>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={props.data().functions.length > limit()}>
          <button type="button" class="link mt-2" onClick={() => setLimit(limit() + PAGE_STEP)}>
            {MAP.showMoreFunctions(Math.min(PAGE_STEP, props.data().functions.length - limit()))}
          </button>
        </Show>
      </aside>
    </div>
  );
}

function FunctionDetails(props: { fn: Fn }) {
  return (
    <section class="my-2 rounded border border-line bg-bg p-2" aria-labelledby="selected-function-title" aria-live="polite">
      <h4 id="selected-function-title" class="mb-1 text-sm font-semibold">{MAP.detailHeading}</h4>
      <dl class="grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1 text-sm">
        <dt class="text-mute">{MAP.fields.name}</dt>
        <dd class="break-all">{props.fn.name}</dd>
        <dt class="text-mute">{MAP.fields.address}</dt>
        <dd><code>{props.fn.addr || "address unavailable"}</code></dd>
        <dt class="text-mute">{MAP.fields.size}</dt>
        <dd>{bytes(props.fn.bytes)}</dd>
        <dt class="text-mute">{MAP.fields.status}</dt>
        <dd><StatusChip status={props.fn.status} /></dd>
        <Show when={props.fn.fuzzyReported}>
          <dt class="text-mute">{MAP.fields.fuzzy}</dt>
          <dd>{props.fn.fuzzy.toFixed(1)}%</dd>
        </Show>
      </dl>
    </section>
  );
}

function Canvas(props: { data: Accessor<Views["treemap"]>; onFunction?: (id: string) => void }) {
  const page = usePage();
  // Honour the system setting, including a change made while the page is open.
  const [calm, setCalm] = createSignal(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  onMount(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCalm(query.matches);
    query.addEventListener("change", update);
    onCleanup(() => query.removeEventListener("change", update));
  });
  // Keep the option object stable when a route change leaves the map unchanged.
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
    const current = props.data();
    const ref = params.data?.ref as MapRef | undefined;
    if (!ref) return;
    if (ref.kind === "fn") {
      if (current.kind === "game") props.onFunction?.(ref.id);
      else page.go({ view: { kind: "fn", id: ref.id } });
    } else if (ref.kind === "image" && current.kind === "game") {
      page.go({ ...HOME, view: { kind: "image", id: ref.id } });
    } else if (ref.kind === "library") {
      page.go({ lib: ref.id });
    }
  };
  return <Chart option={option()} height={window.innerWidth < 700 ? 420 : 620} label={props.data().label} onClick={onClick} crossfade={!calm()} replace />;
}
