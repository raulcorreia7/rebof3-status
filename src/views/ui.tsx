// Small pieces the views share.

import { For, type JSX } from "solid-js";
import type { Route } from "../model/route.ts";
import { STATUS } from "../model/status.ts";
import { usePage } from "../state.ts";
import type { Status } from "../types.ts";
import type { MeterRow, Part } from "../viewtypes.ts";
import { scrollToSection } from "./scroll.ts";

export const Chip = (props: { color: string }) => <i class="chip" style={{ "--c": props.color }} aria-hidden="true" />;

export const StatusChip = (props: { status: Status }) => (
  <span class={`status phase-${STATUS[props.status].phase}`}>
    <Chip color={STATUS[props.status].color} />
    {STATUS[props.status].label}
  </span>
);

export const Meter = (props: { row: MeterRow }) => (
  <div class="meter" role="img" aria-label={props.row.aria}>
    <For each={props.row.parts}>{(part) => <i style={{ width: `${part.width}%`, background: part.color }} />}</For>
  </div>
);

/** A link to a view of the page; with `scroll` it also scrolls to that section. */
export function Jump(props: { to: Partial<Route>; scroll?: string; class?: string; title?: string; children: JSX.Element }) {
  const page = usePage();
  return (
    <a class={props.class} href={page.href(props.to)} title={props.title} onClick={() => props.scroll && scrollToSection(props.scroll)}>
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
  const inner = part.code ? <code class={part.mute ? "mute" : undefined}>{part.text}</code> : part.text;
  const body = part.status ? (
    <StatusChip status={part.status} />
  ) : part.pill ? (
    <span class={`pill ${part.pill}`}>{part.text}</span>
  ) : part.to ? (
    <Jump to={part.to} scroll={part.scroll}>
      {inner}
    </Jump>
  ) : part.url ? (
    <a href={part.url} rel="noopener">
      {inner}
    </a>
  ) : part.small ? (
    <div class="mute small">{part.text}</div>
  ) : part.mute && !part.code ? (
    <span class="mute">{part.text}</span>
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
