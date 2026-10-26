// The simple views: cards, meters, text, legend, trend, filters and tables.

import { createSignal, For, Index, onCleanup, Show, type Accessor } from "solid-js";
import { BROWSER } from "../strings.ts";
import { usePage } from "../state.ts";
import type { SortKey } from "../model/route.ts";
import type { Status } from "../types.ts";
import type { Views } from "../viewtypes.ts";
import { Chart } from "./Chart.tsx";
import { BarParts, Chip, Jump, Meter, Parts } from "./ui.tsx";

/** How long the search box waits after the last key before the table filters. */
const SEARCH_PAUSE_MS = 150;

type Props<K extends keyof Views> = { data: Accessor<Views[K]> };

const input = "rounded-md border border-line bg-card px-2.5 py-1.5 text-ink";

export function Cards(props: Props<"cards">) {
  return (
    <div class="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-4">
      <For each={props.data().cards}>
        {(card) => (
          <div class="card" data-card={card.id}>
            <div class="text-sm">{card.title}</div>
            <div class="text-4xl leading-tight font-bold tabular-nums" style={{ color: card.color }}>
              {card.big}
            </div>
            <div class="text-sm text-mute">{card.sub}</div>
          </div>
        )}
      </For>
    </div>
  );
}

export function Meters(props: Props<"meters">) {
  return (
    <>
      <Show when={props.data().key}>
        {(key) => (
          <div class="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-hidden="true">
            <For each={key()}>
              {(item) => (
                <span class="inline-flex items-center">
                  <Chip color={item.color} />
                  {item.label}
                </span>
              )}
            </For>
          </div>
        )}
      </Show>
      <Show
        when={props.data().rows.some((row) => row.name || row.label)}
        fallback={<For each={props.data().rows}>{(row) => <Meter row={row} />}</For>}
      >
        <ul class="my-2 grid grid-cols-[6rem_1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[11rem_1fr_auto]">
          <For each={props.data().rows}>
            {(row) => (
              <li class="contents">
                <Show when={row.name} fallback={<span class="break-words">{row.label}</span>}>
                  {(name) => (
                    <Jump class="break-words" to={name().to} scroll={name().scroll}>
                      {name().label}
                    </Jump>
                  )}
                </Show>
                <div class="bar h-3.5 min-w-1" style={{ width: `${row.width}%` }} role="img" aria-label={row.aria}>
                  <BarParts parts={row.parts} />
                </div>
                <span class="text-right text-sm text-mute tabular-nums">{row.count}</span>
                <Show when={row.note}>
                  <span class="col-span-2 col-start-2 mb-2 text-sm text-mute">{row.note}</span>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  );
}

export function Text(props: Props<"text">) {
  return (
    <For each={props.data().paragraphs}>
      {(paragraph) => (
        <p class="my-1 text-sm">
          <Show when={paragraph.label}>
            <b>{paragraph.label}</b>{" "}
          </Show>
          {paragraph.text}
        </p>
      )}
    </For>
  );
}

/** Status chips that filter the function table. */
export function Legend(props: Props<"legend">) {
  const page = usePage();
  const toggle = (status: Status) =>
    page.go({ st: page.route.st.includes(status) ? page.route.st.filter((key) => key !== status) : [...page.route.st, status] }, true);
  return (
    <div class="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label={props.data().label}>
      <For each={props.data().items}>
        {(item) => {
          const on = () => page.route.st.includes(item.key);
          return (
            <button
              type="button"
              class={`inline-flex cursor-pointer items-center rounded-full border px-2.5 py-0.5 text-xs ${on() ? "border-accent bg-track" : "border-line bg-card"}`}
              aria-pressed={on()}
              onClick={() => toggle(item.key)}
            >
              <Chip color={item.color} />
              {item.label}
            </button>
          );
        }}
      </For>
    </div>
  );
}

export function Trend(props: Props<"trend">) {
  return (
    <div class="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4">
      {/* Index, not For: a new selector result must update the eight chart options in place,
          not dispose and re-create their ECharts instances. */}
      <Index each={props.data().charts}>
        {(chart) => (
          <figure class="card px-2.5 py-2" data-chart={chart().id}>
            <figcaption class="text-sm">{chart().value ? `${chart().title}: ${chart().value}` : chart().title}</figcaption>
            <Show when={chart().option} fallback={<p class="py-5 text-sm text-mute">{props.data().empty}</p>}>
              {(option) => <Chart option={option()} height={170} label={`${chart().title}, latest ${chart().value}`} />}
            </Show>
          </figure>
        )}
      </Index>
    </div>
  );
}

export function Filters(props: Props<"filters">) {
  const page = usePage();
  const current = (field: "part" | "target" | "lib" | "sort") => page.route[field] ?? "";
  // The table follows the typing after a short pause, not at every key.
  let pause = 0;
  const search = (text: string) => {
    window.clearTimeout(pause);
    pause = window.setTimeout(() => page.go({ q: text }, true), SEARCH_PAUSE_MS);
  };
  onCleanup(() => window.clearTimeout(pause));
  return (
    <div class="mt-2.5 flex flex-wrap items-end gap-x-3 gap-y-2">
      <input
        type="search"
        class={`${input} max-w-90 flex-[1_1_15rem]`}
        placeholder={props.data().search.placeholder}
        aria-label={props.data().search.label}
        autocomplete="off"
        value={page.route.q}
        onInput={(event) => search(event.currentTarget.value)}
      />
      <For each={props.data().selects}>
        {(select) => {
          const groups: { group?: string; items: typeof select.options }[] = [];
          for (const option of select.options) {
            const last = groups[groups.length - 1];
            if (last && last.group === option.group) last.items.push(option);
            else groups.push({ group: option.group, items: [option] });
          }
          const options = (items: typeof select.options) => (
            <For each={items}>
              {(option) => (
                <option value={option.value} selected={option.value === current(select.field)}>
                  {option.label}
                </option>
              )}
            </For>
          );
          return (
            <label class="flex flex-col gap-0.5 text-xs text-mute">
              {select.label}
              <select
                class={`${input} text-base`}
                onChange={(event) => page.go({ [select.field]: select.any ? event.currentTarget.value || null : event.currentTarget.value, ...select.also }, true)}
              >
                <For each={groups}>{(entry) => (entry.group ? <optgroup label={entry.group}>{options(entry.items)}</optgroup> : options(entry.items))}</For>
              </select>
            </label>
          );
        }}
      </For>
    </div>
  );
}

export function Table(props: Props<"table">) {
  const page = usePage();
  const [copied, setCopied] = createSignal(false);
  const selected = () => page.route.fn;
  const sortBy = (sort: SortKey) => page.go(page.route.sort === sort ? { dir: page.route.dir === "asc" ? "desc" : "asc" } : { sort, dir: sort === "size" ? "desc" : "asc" }, true);
  const arrow = (sort?: SortKey) => (sort && page.route.sort === sort ? (page.route.dir === "asc" ? " ▲" : " ▼") : "");
  const ariaSort = (sort?: SortKey) => (sort ? (page.route.sort === sort ? (page.route.dir === "asc" ? "ascending" : "descending") : "none") : undefined);
  const align = (column: { align?: "r" }) => (column.align ? "text-right" : "text-left");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar still holds the link */
    }
  };
  const table = () => (
    <div class="mt-2 max-h-[70vh] overflow-auto rounded-md border border-line bg-card">
      <table class="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr>
            <For each={props.data().columns}>
              {(column) => (
                <th class={`sticky top-0 border-b border-line bg-card px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-mute ${align(column)}`} aria-sort={ariaSort(column.sort)}>
                  {column.sort ? (
                    <button type="button" class="cursor-pointer" onClick={() => sortBy(column.sort!)}>
                      {column.label}
                      {arrow(column.sort)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <For each={props.data().rows}>
            {(row) => (
              <tr class={row.id === selected() ? "bg-track" : ""} data-fn={row.id}>
                <For each={row.cells}>
                  {(cell, index) => (
                    <td class={`px-3 py-1.5 whitespace-nowrap ${align(props.data().columns[index()])}`}>
                      <Parts parts={cell} />
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      <Show when={props.data().message !== undefined}>
        <div class="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1">
          <p class="text-sm text-mute" id="count" aria-live="polite">
            {props.data().message}
          </p>
          <Show when={props.data().actions}>
            {(actions) => (
              <span class="flex gap-3.5 text-sm">
                <Show when={actions().canReset}>
                  <button type="button" class="link" onClick={() => page.go({ q: "", st: [], part: "all", lib: null, target: null, sort: "address", dir: "asc" }, true)}>
                    {BROWSER.reset}
                  </button>
                </Show>
                <button type="button" class="link" onClick={copy}>
                  {copied() ? BROWSER.copied : BROWSER.share}
                </button>
              </span>
            )}
          </Show>
        </div>
      </Show>
      <Show when={props.data().disclosure} fallback={table()}>
        {(summary) => (
          <details class="mt-5 text-sm">
            <summary class="cursor-pointer text-mute hover:text-ink">{summary()}</summary>
            {table()}
          </details>
        )}
      </Show>
      <Show when={props.data().more}>
        {(more) => (
          <button type="button" class="btn mt-2.5 text-accent" onClick={page.showMore}>
            {more()}
          </button>
        )}
      </Show>
    </>
  );
}
