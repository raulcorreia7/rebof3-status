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
        <aside class="inspector" ref={panel} tabIndex={-1} aria-label={`${data().kind}: ${data().title}`} data-inspector={data().view}>
          <div class="inspector-head">
            <div>
              <div class="mute small">{data().kind}</div>
              <h2>{data().title}</h2>
            </div>
            <div class="inspector-actions">
              <button type="button" class="ghost" onClick={copy}>
                {copied() ? INSPECT.copied : INSPECT.copyLink}
              </button>
              <button type="button" class="ghost" onClick={close} aria-label={INSPECT.close}>
                {INSPECT.close}
              </button>
            </div>
          </div>
          <Show when={data().message}>{(message) => <p>{message()}</p>}</Show>
          <Show when={data().note}>{(note) => <p class="mute">{note()}</p>}</Show>
          <Show when={data().meter}>{(meter) => <Meter row={meter()} />}</Show>
          <Show when={data().statuses}>
            {(statuses) => (
              <ul class="status-list">
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
            <dl>
              <For each={data().fields}>
                {(field) => (
                  <>
                    <dt>{field.label}</dt>
                    <dd>
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
                <h3>{list.heading}</h3>
                <ul class="target-list">
                  <For each={list.items}>
                    {(item) => (
                      <li>
                        <Jump to={item.to} scroll={item.scroll}>
                          {item.label}
                        </Jump>
                        <span class="mute small">{item.side}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </>
            )}
          </For>
          <div class="inspector-buttons">
            <For each={data().buttons}>
              {(button) => (
                <Jump class="button" to={button.to} scroll={button.scroll}>
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
