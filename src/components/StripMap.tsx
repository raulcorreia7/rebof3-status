// Address strips: each target's address range wrapped into rows of equal byte length, so the
// picture shows where code, data and reserved space sit in memory.

import { useMemo } from "preact/hooks";
import { DATA_LABEL, MAP, STATUS_LABEL } from "../strings.ts";
import { hex, number, percent } from "../model/format.ts";
import { isDone } from "../model/status.ts";
import { fitText, pickScale, place, stripEntries, stripRows } from "../model/strips.ts";
import { textWidth } from "../model/text.ts";
import { usePage } from "../state.tsx";
import type { Status, Target, Unit } from "../types.ts";
import { statusVar } from "./ui.tsx";

const WIDTH = 1020;
const GUTTER = 84; // room for the row start addresses
const ROW = 12; // pixels per strip row
const ROW_GAP = 1;
const MAX_ROWS = 14; // the finest scale that fits this many rows is used
const HEAD = 40;
const SPACE = 18;

const unitFill = (unit: Unit, reserved: boolean) => (reserved ? "url(#reserved-space)" : statusVar(unit[3]));

function unitTip(target: Target, [offset, size, kind, status, name]: Unit, reserved: boolean): string {
  const at = target.base + offset;
  if (reserved) return `${target.id}+${hex(at)} ${name} · ${DATA_LABEL.reserved} · ${number(size)} B`;
  const label = kind === "d" ? DATA_LABEL[status as keyof typeof DATA_LABEL] : STATUS_LABEL[status as Status];
  return `${target.id}${kind === "d" ? "+" : "@"}${hex(at)} ${name} · ${label}${kind === "s" ? " · PsyQ" : ""} · ${number(size)} B`;
}

function Strip({ target, showReserved, lit }: { target: Target; showReserved: boolean; lit: Status[] }) {
  const mapWidth = WIDTH - GUTTER;
  const { entries, size } = useMemo(() => stripEntries(target, showReserved), [target, showReserved]);
  const scale = pickScale(size, mapWidth, MAX_ROWS);
  const rows = stripRows(size, scale, mapWidth);
  const pieces = useMemo(() => place(entries, scale, mapWidth), [entries, scale, mapWidth]);
  const pitch = ROW + ROW_GAP;
  const verdict = target.link?.status ?? null;
  const pill = verdict ? MAP.imageLinked(verdict) : MAP.imageNotLinked;
  const pillWidth = textWidth(pill, 11) + 14;
  const game = target.functions.filter((fn) => fn.kind === "game");
  const matched = game.filter(isDone).length;
  const detail =
    `${target.id} · ${hex(target.base)}-${hex(target.end)} · ${number(target.size)} B · ${number(target.functions.length)} functions` +
    (game.length ? ` · ${MAP.gamePercent(percent(matched, game.length, 1))}` : "") +
    ` · ${MAP.scale(scale)}`;
  const labelled = new Set<number>();
  return (
    <svg class="strip" viewBox={`0 0 ${WIDTH} ${HEAD + rows * pitch}`} role="img" aria-label={`${target.name}: ${detail}`} data-target={target.id}>
      <text x="0" y="14" class="strip-name">
        {target.name}
      </text>
      <text x="0" y="31" class="strip-detail">
        {detail}
      </text>
      <g transform={`translate(${WIDTH - pillWidth} 2)`}>
        <rect width={pillWidth} height="16" rx="3" style={{ fill: verdict === "EXACT" ? "var(--st-pure)" : verdict ? "var(--danger)" : "var(--track)" }} />
        <text x={pillWidth / 2} y="12" text-anchor="middle" class="pill-text">
          {pill}
        </text>
      </g>
      {Array.from({ length: rows }, (_, row) => (
        <g key={row}>
          <rect x={GUTTER} y={HEAD + row * pitch} width={mapWidth} height={ROW} class="strip-track" />
          <text x={GUTTER - 6} y={HEAD + row * pitch + 9} text-anchor="end" class="strip-address">
            {hex(target.base + row * scale * mapWidth)}
          </text>
        </g>
      ))}
      {pieces.map(([index, row, x, width], at) => {
        const { unit, reserved } = entries[index];
        const function_ = unit[2] !== "d";
        const dim = function_ && lit.length > 0 && !lit.includes(unit[3] as Status);
        const id = function_ ? `${target.id}@${hex(target.base + unit[0])}` : undefined;
        return (
          <rect key={at} x={GUTTER + x} y={HEAD + row * pitch} width={width} height={ROW} data-fn={id} class={`block${dim ? " dim" : ""}${reserved ? " reserved" : ""}`} style={{ fill: unitFill(unit, reserved) }}>
            <title>{unitTip(target, unit, reserved)}</title>
          </rect>
        );
      })}
      {pieces.map(([index, row, x, width], at) => {
        const { unit, reserved } = entries[index];
        if (!reserved || labelled.has(index)) return null;
        const label = fitText("reserved", 10, width - 6, textWidth);
        if (!label) return null;
        labelled.add(index);
        return (
          <text key={`l${at}`} x={GUTTER + x + 3} y={HEAD + row * pitch + 9} class="strip-reserved">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function StripMap({ targets }: { targets: Target[] }) {
  const { route, go, model } = usePage();
  const ordered = useMemo(
    () => [...targets].sort((a, b) => Number(b.id.startsWith("exe/")) - Number(a.id.startsWith("exe/")) || a.id.localeCompare(b.id)),
    [targets],
  );
  const onClick = (event: MouseEvent) => {
    const id = (event.target as Element).closest("[data-fn]")?.getAttribute("data-fn");
    const fn = id ? model.functionById.get(id) : null;
    if (fn) go({ view: { kind: "fn", target: fn.target, addr: fn.addr } });
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
          <input type="checkbox" checked={route.reserved} onChange={(event) => go({ reserved: event.currentTarget.checked }, true)} /> {MAP.showReserved}
        </label>
      </div>
      <p class="mute small">{MAP.reservedHelp}</p>
      {ordered.map((target) => (
        <Strip key={target.id} target={target} showReserved={route.reserved} lit={route.st} />
      ))}
    </div>
  );
}
