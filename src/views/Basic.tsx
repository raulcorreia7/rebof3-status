// The simple views: cards, meters, text, search and tables.

import { createSignal, For, onCleanup, Show, type Accessor } from "solid-js";
import { BROWSER } from "../strings.ts";
import { usePage } from "../state.ts";
import type { SortKey } from "../model/route.ts";
import type { Views } from "../viewtypes.ts";
import { Meter, Parts, StatusKey } from "./ui.tsx";

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
      <Show when={props.data().key}>{(key) => <StatusKey items={key()} />}</Show>
      <For each={props.data().rows}>{(row) => <Meter row={row} class="my-3 h-3.5" />}</For>
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

export function Filters(props: Props<"filters">) {
  const page = usePage();
  // The table follows the typing after a short pause, not at every key.
  let pause = 0;
  const search = (text: string) => {
    window.clearTimeout(pause);
    pause = window.setTimeout(() => page.go({ q: text }, true), SEARCH_PAUSE_MS);
  };
  onCleanup(() => window.clearTimeout(pause));
  return (
    <div class="mt-2.5">
      <input
        type="search"
        class={`${input} w-full max-w-90`}
        placeholder={props.data().search.placeholder}
        aria-label={props.data().search.label}
        autocomplete="off"
        value={page.route.q}
        onInput={(event) => search(event.currentTarget.value)}
      />
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
