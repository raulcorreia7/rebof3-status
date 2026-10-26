// Small pieces the views share.

import { For, type JSX } from "solid-js";
import type { Route } from "../model/route.ts";
import { STATUS } from "../model/status.ts";
import { usePage } from "../state.ts";
import type { Status } from "../types.ts";
import type { MeterRow, Part } from "../viewtypes.ts";

export const Chip = (props: { color: string; class?: string }) => (
  <i class={`inline-block size-2.5 flex-none rounded-xs ${props.class ?? "mr-1.5"}`} style={{ background: props.color }} aria-hidden="true" />
);

export const StatusChip = (props: { status: Status }) => (
  <span class="inline-flex items-center whitespace-nowrap">
    <Chip color={STATUS[props.status].color} />
    {STATUS[props.status].label}
  </span>
);

/** The game statuses with their counts, the key of every game code bar. */
export const StatusKey = (props: { items: { label: string; color: string; sub: string }[] }) => (
  <ul class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
    <For each={props.items}>
      {(item) => (
        <li class="flex items-start">
          <Chip color={item.color} class="mt-1.5 mr-2" />
          <span>
            {item.label}
            <span class="block text-sm text-mute tabular-nums">{item.sub}</span>
          </span>
        </li>
      )}
    </For>
  </ul>
);

/** The coloured parts of a bar. */
export const BarParts = (props: { parts: MeterRow["parts"] }) => <For each={props.parts}>{(part) => <i style={{ width: `${part.width}%`, background: part.color }} />}</For>;

export const Meter = (props: { row: MeterRow; class?: string }) => (
  <div class={`bar ${props.class ?? "my-2"}`} role="img" aria-label={props.row.aria}>
    <BarParts parts={props.row.parts} />
  </div>
);

/**
 * A link to a view of the page. A plain click navigates in place (and scrolls to `scroll`, a
 * home page section); a click with a modifier key is left to the browser, for a new tab.
 */
export function Jump(props: { to: Partial<Route>; scroll?: string; class?: string; title?: string; "aria-label"?: string; "aria-current"?: boolean; children: JSX.Element }) {
  const page = usePage();
  const open = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    page.go(props.to, false, props.scroll);
  };
  return (
    <a
      class={props.class}
      href={page.href(props.to) === "#" && props.scroll ? `#${props.scroll}` : page.href(props.to)}
      title={props.title}
      aria-label={props["aria-label"]}
      aria-current={props["aria-current"] ? "true" : undefined}
      onClick={open}
    >
      {props.children}
    </a>
  );
}

/** Inline content from a selector. */
export function Parts(props: { parts: Part[] }) {
  return <For each={props.parts}>{(part) => <PartView part={part} />}</For>;
}

function PartView(props: { part: Part }) {
  const part = props.part;
  const inner = part.code ? <code class={part.mute ? "text-mute" : undefined}>{part.text}</code> : part.text;
  const body = part.status ? (
    <StatusChip status={part.status} />
  ) : part.to ? (
    <Jump to={part.to} scroll={part.scroll}>
      {inner}
    </Jump>
  ) : part.url ? (
    <a href={part.url} rel="noopener">
      {inner}
    </a>
  ) : part.mute && !part.code ? (
    <span class="text-mute">{part.text}</span>
  ) : (
    inner
  );
  return (
    <>
      {part.br ? <br /> : null}
      {body}
    </>
  );
}
