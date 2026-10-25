// The inspector panel: the details of the function, target or group the route names.

import { createEffect, createSignal, For, on, onCleanup, Show, type Accessor } from "solid-js";
import { INSPECT } from "../strings.ts";
import { usePage } from "../state.ts";
import type { Views } from "../viewtypes.ts";
import { Jump, Meter, Parts, StatusChip } from "./ui.tsx";

export function Inspector(props: { data: Accessor<Views["inspector"]> }) {
  const page = usePage();
  let panel: HTMLElement | undefined;
  let opener: Element | null = null;
  const [copied, setCopied] = createSignal(false);
  const close = () => page.go({ view: { kind: "home" } });
  const key = () => {
    const data = props.data();
    return data ? `${data.view}:${data.title}` : "";
  };

  // Move focus into the panel when it opens and give it back when it closes.
  createEffect(
    on(key, (current) => {
      if (current) {
        opener ??= document.activeElement;
        panel?.focus({ preventScroll: true });
      } else {
        if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
        opener = null;
      }
    }),
  );
  createEffect(() => {
    if (!props.data()) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar still holds the link */
    }
  };

  return (
    <Show when={props.data()}>
      {(data) => (
        <aside
          class="sticky top-0 h-screen w-100 max-w-full flex-none self-start overflow-auto border-l border-line bg-card p-4 focus:outline-none max-xl:fixed max-xl:inset-x-0 max-xl:bottom-0 max-xl:top-auto max-xl:z-20 max-xl:h-[62vh] max-xl:w-auto max-xl:rounded-t-xl max-xl:border max-xl:shadow-[0_-8px_24px_rgb(0_0_0/0.35)]"
          ref={panel} tabIndex={-1} aria-label={`${data().kind}: ${data().title}`} data-inspector={data().view}>
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-sm text-mute">{data().kind}</div>
              <h2 class="text-xl font-semibold break-all">{data().title}</h2>
            </div>
            <div class="flex flex-wrap justify-end gap-1.5">
              <button type="button" class="btn" onClick={copy}>
                {copied() ? INSPECT.copied : INSPECT.copyLink}
              </button>
              <button type="button" class="btn" onClick={close} aria-label={INSPECT.close}>
                {INSPECT.close}
              </button>
            </div>
          </div>
          <Show when={data().message}>{(message) => <p class="my-1">{message()}</p>}</Show>
          <Show when={data().note}>{(note) => <p class="my-1 text-mute">{note()}</p>}</Show>
          <Show when={data().meter}>{(meter) => <Meter row={meter()} />}</Show>
          <Show when={data().statuses}>
            {(statuses) => (
              <ul class="my-2 text-sm">
                <For each={statuses()}>
                  {(item) => (
                    <li>
                      <StatusChip status={item.status} /> {item.count}
                    </li>
                  )}
                </For>
              </ul>
            )}
          </Show>
          <Show when={data().fields.length}>
            <dl class="my-3 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              <For each={data().fields}>
                {(field) => (
                  <>
                    <dt class="text-mute">{field.label}</dt>
                    <dd class="break-words">
                      <Parts parts={field.value} />
                    </dd>
                  </>
                )}
              </For>
            </dl>
          </Show>
          <For each={data().lists}>
            {(list) => (
              <>
                <h3 class="mt-5 mb-1 font-semibold">{list.heading}</h3>
                <ul class="mt-2 mb-2.5 divide-y divide-line border-t border-line text-sm">
                  <For each={list.items}>
                    {(item) => (
                      <li class="flex justify-between gap-2 py-0.5">
                        <Jump to={item.to} scroll={item.scroll}>
                          {item.label}
                        </Jump>
                        <span class="text-sm text-mute">{item.side}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </>
            )}
          </For>
          <div class="mt-2.5 flex flex-wrap gap-2">
            <For each={data().buttons}>
              {(button) => (
                <Jump class="btn text-accent" to={button.to} scroll={button.scroll}>
                  {button.label}
                </Jump>
              )}
            </For>
          </div>
        </aside>
      )}
    </Show>
  );
}
