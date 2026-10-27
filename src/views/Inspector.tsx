// The side panel: the details of the source file (unit) the route opens, beside any page.

import { type Accessor, createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import { usePage } from "../state.ts";
import { INSPECT } from "../strings.ts";
import type { Views } from "../viewtypes.ts";
import { Parts } from "./ui.tsx";

export function Inspector(props: { data: Accessor<Views["inspector"]> }) {
  const page = usePage();
  let panel: HTMLElement | undefined;
  let opener: Element | null = null;
  const [copied, setCopied] = createSignal(false);
  const close = () => page.go({ fn: null });

  // Move focus into the panel when it opens and give it back when it closes.
  createEffect(
    on(
      () => props.data()?.title ?? "",
      (current) => {
        if (current) {
          opener ??= document.activeElement;
          panel?.focus({ preventScroll: true });
        } else {
          if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
          opener = null;
        }
      },
    ),
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
          class="sticky top-0 h-screen w-100 max-w-full flex-none self-start overflow-auto border-l border-line bg-card p-4 focus:outline-none max-xl:fixed max-xl:inset-x-0 max-xl:top-auto max-xl:bottom-0 max-xl:z-20 max-xl:h-[62vh] max-xl:w-auto max-xl:rounded-t-xl max-xl:border max-xl:shadow-[0_-8px_24px_rgb(0_0_0/0.35)]"
          ref={panel}
          tabIndex={-1}
          aria-label={`${INSPECT.kind}: ${data().title}`}
          data-inspector
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm text-mute">{INSPECT.kind}</div>
              <h2 class="text-xl font-semibold break-all">{data().title}</h2>
            </div>
            <div class="flex flex-wrap justify-end gap-1.5">
              <button type="button" class="btn" onClick={copy}>
                {copied() ? INSPECT.copied : INSPECT.copyLink}
              </button>
              <button type="button" class="btn" onClick={close}>
                {INSPECT.close}
              </button>
            </div>
          </div>
          <Show when={data().message}>{(message) => <p class="my-2">{message()}</p>}</Show>
          <Show when={data().fields.length}>
            <dl class="my-3 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              <For each={data().fields}>
                {(field) => (
                  <>
                    <dt class="text-mute">{field.label}</dt>
                    <dd class="min-w-0 break-words">
                      <Parts parts={field.value} />
                    </dd>
                  </>
                )}
              </For>
            </dl>
          </Show>
        </aside>
      )}
    </Show>
  );
}
