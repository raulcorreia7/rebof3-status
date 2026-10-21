// The simple views: cards, meters, text, legend, tabs, trend, filters and tables.

import { createSignal, For, Show, type Accessor } from "solid-js";
import { BROWSER, SDK } from "../strings.ts";
import { usePage } from "../state.ts";
import type { SortKey } from "../model/route.ts";
import type { Status } from "../types.ts";
import type { Views } from "../viewtypes.ts";
import { Chart } from "./Chart.tsx";
import { Chip, Jump, Meter, Parts } from "./ui.tsx";

type Props<K extends keyof Views> = { data: Accessor<Views[K]> };

export function Cards(props: Props<"cards">) {
  return (
    <div class={props.data().grid}>
      <For each={props.data().cards}>
        {(card) =>
          card.panel ? (
            <article class="card group" data-group={card.id}>
              <header>
                <h3>{card.title}</h3>
                <div class="card-big small-big">{card.big}</div>
              </header>
              <p class="mute small">{card.panel.note}</p>
              <Meter row={card.panel.meter} />
              <p class="small">{card.panel.line}</p>
              <ul class="target-list">
                <For each={card.panel.links}>
                  {(link) => (
                    <li>
                      <Jump to={link.to} scroll={link.scroll}>
                        {link.label}
                      </Jump>
                      <span class="mute small">{link.side}</span>
                    </li>
                  )}
                </For>
              </ul>
              <Jump class="button" to={card.panel.action.to} scroll={card.panel.action.scroll}>
                {card.panel.action.label}
              </Jump>
            </article>
          ) : (
            <div class="card" data-card={card.id}>
              <div class="card-title">{card.title}</div>
              <div class={`card-big${props.data().small ? " small-big" : ""}`} style={{ color: card.color }}>
                {card.big}
              </div>
              <div class="mute small">{card.sub}</div>
            </div>
          )
        }
      </For>
    </div>
  );
}

export function Meters(props: Props<"meters">) {
  return (
    <>
      <Show when={props.data().key}>
        {(key) => (
          <div class="legend" aria-hidden="true">
            <For each={key()}>
              {(item) => (
                <span class="legend-item static">
                  <i class="chip" style={{ "--c": item.color }} />
                  {item.label}
                </span>
              )}
            </For>
          </div>
        )}
      </Show>
      <Show
        when={props.data().rows.some((row) => row.name)}
        fallback={<For each={props.data().rows}>{(row) => <Meter row={row} />}</For>}
      >
        <ul class="libs">
          <For each={props.data().rows}>
            {(row) => (
              <li>
                <Jump class="lib-name" to={row.name!.to} scroll={row.name!.scroll} title={SDK.browse}>
                  {row.name!.label}
                </Jump>
                <div class="lib-bar" style={{ width: `${row.width}%` }} role="img" aria-label={row.aria}>
                  <For each={row.parts}>{(part) => <i style={{ width: `${part.width}%`, background: part.color }} />}</For>
                </div>
                <span class="lib-count">{row.count}</span>
                <span class="lib-note mute small">{row.note}</span>
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
        <p class="small">
          <b>{paragraph.label}</b> {paragraph.text}
        </p>
      )}
    </For>
  );
}

/** The status legend: a filter of the map (`legend`) or of the function table (`chips`). */
export function Legend(props: Props<"legend">) {
  const page = usePage();
  const toggle = (status: Status) =>
    page.go({ st: page.route.st.includes(status) ? page.route.st.filter((key) => key !== status) : [...page.route.st, status] }, true);
  const chips = () => props.data().variant === "chips";
  return (
    <div class={chips() ? "" : "legend-block"}>
      <div class={chips() ? "chips" : "legend"} role="group" aria-label={props.data().label}>
        <For each={props.data().items}>
          {(item) => {
            const on = () => page.route.st.includes(item.key);
            return (
              <button
                type="button"
                class={chips() ? `chip-button${on() ? " on" : ""}` : `legend-item phase-${item.phase}${on() ? " on" : ""}${page.route.st.length && !on() ? " off" : ""}`}
                aria-pressed={on()}
                onClick={() => toggle(item.key)}
              >
                <Chip color={item.color} />
                {item.sub ? (
                  <span>
                    {item.label}
                    <small>{item.sub}</small>
                  </span>
                ) : (
                  item.label
                )}
              </button>
            );
          }}
        </For>
      </div>
      <Show when={props.data().help}>
        {(help) => (
          <p class="mute small">
            {help().text}{" "}
            <Show when={page.route.st.length}>
              <button type="button" class="link" onClick={() => page.go({ st: [] }, true)}>
                {help().clear}
              </button>
            </Show>
          </p>
        )}
      </Show>
    </div>
  );
}

export function Tabs(props: Props<"tabs">) {
  const page = usePage();
  return (
    <div class="tabs" role="group" aria-label={props.data().label}>
      <For each={props.data().tabs}>
        {(tab) => (
          <button type="button" class={`tab${page.route.map === tab.id ? " on" : ""}`} aria-pressed={page.route.map === tab.id} onClick={() => page.go({ map: tab.id }, true)}>
            {tab.label}
          </button>
        )}
      </For>
    </div>
  );
}

export function ChartView(props: Props<"chart">) {
  return <Show when={props.data()}>{(chart) => <Chart option={chart().option} height={chart().height} label={chart().label} />}</Show>;
}

export function Trend(props: Props<"trend">) {
  return (
    <div class="trend-grid">
      <For each={props.data().charts}>
        {(chart) => (
          <figure data-chart={chart.id}>
            <figcaption>{chart.value ? `${chart.title}: ${chart.value}` : chart.title}</figcaption>
            {chart.option ? <Chart option={chart.option} height={170} label={`${chart.title}, latest ${chart.value}`} /> : <p class="empty mute small">{props.data().empty}</p>}
          </figure>
        )}
      </For>
    </div>
  );
}

export function Filters(props: Props<"filters">) {
  const page = usePage();
  const current = (field: "part" | "target" | "lib" | "sort") => page.route[field] ?? "";
  return (
    <div class="filters">
      <input
        type="search"
        placeholder={props.data().search.placeholder}
        aria-label={props.data().search.label}
        autocomplete="off"
        value={page.route.q}
        onInput={(event) => page.go({ q: event.currentTarget.value }, true)}
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
            <label>
              {select.label}
              <select onChange={(event) => page.go({ [select.field]: select.any ? event.currentTarget.value || null : event.currentTarget.value, ...select.also }, true)}>
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
  const selected = () => (page.route.view.kind === "fn" ? `${page.route.view.target}@${page.route.view.addr}` : "");
  const sortBy = (sort: SortKey) => page.go(page.route.sort === sort ? { dir: page.route.dir === "asc" ? "desc" : "asc" } : { sort, dir: sort === "size" ? "desc" : "asc" }, true);
  const arrow = (sort?: SortKey) => (sort && page.route.sort === sort ? (page.route.dir === "asc" ? " ▲" : " ▼") : "");
  const ariaSort = (sort?: SortKey) => (sort ? (page.route.sort === sort ? (page.route.dir === "asc" ? "ascending" : "descending") : "none") : undefined);
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
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <For each={props.data().columns}>
              {(column) => (
                <th class={column.align} aria-sort={ariaSort(column.sort)}>
                  {column.sort ? (
                    <button type="button" class="th" onClick={() => sortBy(column.sort!)}>
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
        <tbody>
          <For each={props.data().rows}>
            {(row) => (
              <tr class={row.id === selected() ? "selected" : ""} data-fn={row.id}>
                <For each={row.cells}>
                  {(cell, index) => (
                    <td class={props.data().columns[index()].align}>
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
        <div class="browse-bar">
          <p class="mute small" id="count" aria-live="polite">
            {props.data().message}
          </p>
          <Show when={props.data().actions}>
            {(actions) => (
              <span class="browse-actions">
                <Show when={actions().canReset}>
                  <button type="button" class="link" onClick={() => page.go({ q: "", st: [], part: "all", lib: null, target: null, group: null, sort: "address", dir: "asc" }, true)}>
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
          <details>
            <summary>{summary()}</summary>
            {table()}
          </details>
        )}
      </Show>
      <Show when={props.data().more}>
        {(more) => (
          <button type="button" class="button" onClick={page.showMore}>
            {more()}
          </button>
        )}
      </Show>
    </>
  );
}
