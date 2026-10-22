// Address strips: each target's address range wrapped into rows of equal byte length, so the
// picture shows where code, data and reserved space sit in memory.

import { createMemo, For, type Accessor } from "solid-js";
import { DATA_LABEL, MAP } from "../strings.ts";
import { bytes, hex, number, percent } from "../model/format.ts";
import { STATUS, isDone, statusVar } from "../model/status.ts";
import { fitText, pickScale, place, stripEntries, stripRows } from "../model/strips.ts";
import { textWidth } from "../model/text.ts";
import { usePage } from "../state.ts";
import type { Status, Target, Unit } from "../types.ts";
import type { Views } from "../viewtypes.ts";

const WIDTH = 1020;
const GUTTER = 84; // room for the row start addresses
const ROW = 12; // pixels per strip row
const ROW_GAP = 1;
const MAX_ROWS = 14; // the finest scale that fits this many rows is used
const HEAD = 40;

const unitFill = (unit: Unit, reserved: boolean) => (reserved ? "url(#reserved-space)" : statusVar(unit[3]));

function unitTip(target: Target, [offset, size, kind, status, name]: Unit, reserved: boolean): string {
  const at = target.base + offset;
  if (reserved) return `${target.id}+${hex(at)} ${name} · ${DATA_LABEL.reserved} · ${bytes(size)}`;
  const label = kind === "d" ? DATA_LABEL[status as keyof typeof DATA_LABEL] : STATUS[status as Status].label;
  return `${target.id}${kind === "d" ? "+" : "@"}${hex(at)} ${name} · ${label}${kind === "s" ? " · PsyQ" : ""} · ${bytes(size)}`;
}

function Strip(props: { target: Target }) {
  const page = usePage();
  const mapWidth = WIDTH - GUTTER;
  const target = props.target;
  const packed = createMemo(() => stripEntries(target, page.route.reserved));
  const scale = createMemo(() => pickScale(packed().size, mapWidth, MAX_ROWS));
  const rows = createMemo(() => stripRows(packed().size, scale(), mapWidth));
  const pieces = createMemo(() => place(packed().entries, scale(), mapWidth));
  const pitch = ROW + ROW_GAP;
  const verdict = target.link?.status ?? null;
  const pill = verdict ? MAP.imageLinked(verdict) : MAP.imageNotLinked;
  const pillWidth = textWidth(pill, 11) + 14;
  const game = target.functions.filter((fn) => fn.kind === "game");
  const matched = game.filter(isDone).length;
  const detail = () =>
    `${target.id} · ${hex(target.base)}-${hex(target.end)} · ${bytes(target.size)} · ${number(target.functions.length)} functions` +
    (game.length ? ` · ${MAP.gamePercent(percent(matched, game.length, 1))}` : "") +
    ` · ${MAP.scale(scale())}`;
  /** The first piece of each reserved unit that is wide enough gets a label. */
  const labels = createMemo(() => {
    const done = new Set<number>();
    return pieces().flatMap(([index, row, x, width]) => {
      if (!packed().entries[index].reserved || done.has(index)) return [];
      const label = fitText(MAP.reservedLabel, 10, width - 6, textWidth);
      if (!label) return [];
      done.add(index);
      return [{ label, x, row }];
    });
  });
  return (
    <svg class="strip" viewBox={`0 0 ${WIDTH} ${HEAD + rows() * pitch}`} role="img" aria-label={`${target.name}: ${detail()}`} data-target={target.id}>
      <text x="0" y="14" class="strip-name">
        {target.name}
      </text>
      <text x="0" y="31" class="strip-detail">
        {detail()}
      </text>
      <g transform={`translate(${WIDTH - pillWidth} 2)`}>
        <rect width={pillWidth} height="16" rx="3" style={{ fill: verdict === "EXACT" ? "var(--st-pure)" : verdict ? "var(--danger)" : "var(--track)" }} />
        <text x={pillWidth / 2} y="12" text-anchor="middle" class="pill-text">
          {pill}
        </text>
      </g>
      <For each={Array.from({ length: rows() }, (_, row) => row)}>
        {(row) => (
          <g>
            <rect x={GUTTER} y={HEAD + row * pitch} width={mapWidth} height={ROW} class="strip-track" />
            <text x={GUTTER - 6} y={HEAD + row * pitch + 9} text-anchor="end" class="strip-address">
              {hex(target.base + row * scale() * mapWidth)}
            </text>
          </g>
        )}
      </For>
      <For each={pieces()}>
        {([index, row, x, width]) => {
          const { unit, reserved } = packed().entries[index];
          const isFunction = unit[2] !== "d";
          const dim = () => isFunction && page.route.st.length > 0 && !page.route.st.includes(unit[3] as Status);
          const id = isFunction ? `${target.id}@${hex(target.base + unit[0])}` : undefined;
          return (
            <rect x={GUTTER + x} y={HEAD + row * pitch} width={width} height={ROW} data-fn={id} class={`block${dim() ? " dim" : ""}${reserved ? " reserved" : ""}`} style={{ fill: unitFill(unit, reserved) }}>
              <title>{unitTip(target, unit, reserved)}</title>
            </rect>
          );
        }}
      </For>
      <For each={labels()}>
        {(item) => (
          <text x={GUTTER + item.x + 3} y={HEAD + item.row * pitch + 9} class="strip-reserved">
            {item.label}
          </text>
        )}
      </For>
    </svg>
  );
}

export function Strips(props: { data: Accessor<Views["strips"]> }) {
  const page = usePage();
  const onClick = (event: MouseEvent) => {
    const id = (event.target as Element).closest("[data-fn]")?.getAttribute("data-fn");
    const fn = id ? page.model.functionById.get(id) : null;
    if (fn) page.go({ view: { kind: "fn", target: fn.target, addr: fn.addr } });
  };
  return (
    <div class="strips" onClick={onClick}>
      <svg width="0" height="0" aria-hidden="true" class="defs">
        <defs>
          <pattern id="reserved-space" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" style={{ fill: "var(--hatch)" }} />
            <path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" style={{ stroke: "var(--hatch-stripe)" }} stroke-width="2" />
          </pattern>
        </defs>
      </svg>
      <div class="map-tools">
        <label class="toggle">
          <input type="checkbox" checked={page.route.reserved} onChange={(event) => page.go({ reserved: event.currentTarget.checked }, true)} /> {MAP.showReserved}
        </label>
      </div>
      <p class="mute small">{MAP.reservedHelp}</p>
      <For each={props.data().targets}>{(target) => <Strip target={target} />}</For>
    </div>
  );
}
