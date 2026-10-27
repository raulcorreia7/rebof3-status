// Game code by part of the game: one block per group with its heading, its
// bar and its images, as labelled bars (few images) or a grid of tiles (many near-identical
// overlays). Plain DOM, one element per image, so every name is real text.

import { For, Show, type Accessor } from "solid-js";
import type { Views } from "../viewtypes.ts";
import { BarParts, Jump, Meter } from "./ui.tsx";

type Group = Views["domains"]["groups"][number];

export function Domains(props: { data: Accessor<Views["domains"]> }) {
  return (
    <For each={props.data().groups}>{(group) => <GroupBlock group={group} />}</For>
  );
}

function GroupBlock(props: { group: Group }) {
  return (
    <div class="mt-8" data-group={props.group.key}>
      <div class="flex flex-wrap items-baseline gap-x-3">
        <h3 class="text-lg font-semibold">
          <Jump to={props.group.title.to}>{props.group.title.label}</Jump>
        </h3>
        <span class="text-2xl font-bold tabular-nums">{props.group.percent}</span>
        <span class="text-sm text-mute tabular-nums">{props.group.line}</span>
      </div>
      <p class="text-sm text-mute">{props.group.note}</p>
      <Meter row={props.group.meter} class="my-2 h-3.5" />
      <Show
        when={props.group.tiles}
        fallback={
          <ul class="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm sm:grid-cols-[minmax(7rem,13rem)_1fr_auto] sm:gap-y-1.5">
            <For each={props.group.images}>
              {(image) => (
                // On a phone the name and the numbers share a line and the bar goes under them.
                <li class="col-span-full grid grid-cols-subgrid items-center gap-y-1">
                  <Jump to={image.to} class="break-words" title={image.id}>
                    {image.label}
                  </Jump>
                  <div class="bar col-span-2 row-start-2 h-3 sm:col-span-1 sm:col-start-2 sm:row-start-1" style={{ width: `${image.width}%` }} role="img" aria-label={image.aria}>
                    <BarParts parts={image.parts} />
                  </div>
                  <span class="text-right whitespace-nowrap text-mute tabular-nums">
                    {image.line} · {image.size}
                  </span>
                </li>
              )}
            </For>
          </ul>
        }
      >
        <ul class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5">
          <For each={props.group.images}>
            {(image) => (
              <li>
                <Jump
                  to={image.to}
                  class="block h-full rounded-md border border-line bg-card px-2 py-1.5 text-ink hover:border-accent hover:no-underline"
                  title={image.id}
                  aria-label={image.aria}
                >
                  <span class="block text-xs/tight font-medium break-words">{image.label}</span>
                  <span class="bar my-1 h-1.5" aria-hidden="true">
                    <BarParts parts={image.parts} />
                  </span>
                  <span class="flex justify-between gap-1 text-xs text-mute tabular-nums">
                    <span>{image.line}</span>
                    <span>{image.size}</span>
                  </span>
                </Jump>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
