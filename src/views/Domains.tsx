// Game code by part of the game: the status key, then one block per group with its heading, its
// bar and its images, as labelled bars (few images) or a grid of tiles (many near-identical
// overlays). Plain DOM, one element per image, so every name is real text.

import { For, Show, type Accessor } from "solid-js";
import { usePage } from "../state.ts";
import type { Views } from "../viewtypes.ts";
import { BarParts, Chip, Jump, Meter } from "./ui.tsx";

type Group = Views["domains"]["groups"][number];
type Image = Group["images"][number];

export function Domains(props: { data: Accessor<Views["domains"]> }) {
  return (
    <>
      <ul class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <For each={props.data().key}>
          {(item) => (
            <li class="flex items-start">
              <Chip color={item.color} class="mt-1.5 mr-2" />
              <span>
                {item.label}
                <span class="block text-sm text-mute">{item.sub}</span>
              </span>
            </li>
          )}
        </For>
      </ul>
      <p class="mt-2 text-sm text-mute">{props.data().keyHelp}</p>
      <For each={props.data().groups}>{(group) => <GroupBlock group={group} />}</For>
    </>
  );
}

function GroupBlock(props: { group: Group }) {
  const page = usePage();
  const current = (image: Image) => page.route.view.kind === "target" && page.route.view.id === image.id;
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
          <ul class="mt-3 grid grid-cols-[minmax(7rem,13rem)_1fr_auto] items-center gap-x-3 gap-y-1.5 text-sm">
            <For each={props.group.images}>
              {(image) => (
                <li class="contents">
                  <Jump to={image.to} class="truncate aria-current:font-semibold" title={image.id} aria-current={current(image)}>
                    {image.label}
                  </Jump>
                  <div class="bar h-3" style={{ width: `${image.width}%` }} role="img" aria-label={image.aria}>
                    <BarParts parts={image.parts} />
                  </div>
                  <span class="text-right text-mute tabular-nums">
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
                  class="block h-full rounded-md border border-line bg-card px-2 py-1.5 text-ink hover:border-accent hover:no-underline aria-current:border-accent"
                  title={image.id}
                  aria-label={image.aria}
                  aria-current={current(image)}
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
