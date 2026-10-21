import { useMemo, useState } from "preact/hooks";
import { BROWSER, STATUS_LABEL } from "../strings.ts";
import { number } from "../model/format.ts";
import { browse } from "../model/browse.ts";
import { HOME, type Part, type SortKey } from "../model/route.ts";
import { STATUSES } from "../model/status.ts";
import { usePage } from "../state.tsx";
import type { Status } from "../types.ts";
import { Section, StatusChip, statusVar } from "./ui.tsx";

const STEP = 200;

export function Browser() {
  const { model, route, go, href } = usePage();
  const found = useMemo(() => browse(model, route), [model, route.q, route.st, route.part, route.lib, route.target, route.group, route.sort, route.dir]);
  const filterKey = `${route.q}|${route.st}|${route.part}|${route.lib}|${route.target}|${route.group}|${route.sort}|${route.dir}`;
  const [shown, setShown] = useState({ key: filterKey, limit: STEP });
  const limit = shown.key === filterKey ? shown.limit : STEP;
  const [copied, setCopied] = useState(false);
  const selected = route.view.kind === "fn" ? `${route.view.target}@${route.view.addr}` : "";
  const filtered = filterKey !== `${HOME.q}|${HOME.st}|${HOME.part}|null|null|null|${HOME.sort}|${HOME.dir}`;

  const toggleStatus = (status: Status) => go({ st: route.st.includes(status) ? route.st.filter((key) => key !== status) : [...route.st, status] }, true);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar still holds the link */
    }
  };
  const sortBy = (sort: SortKey) => go(route.sort === sort ? { dir: route.dir === "asc" ? "desc" : "asc" } : { sort, dir: sort === "size" ? "desc" : "asc" }, true);
  const arrow = (sort: SortKey) => (route.sort === sort ? (route.dir === "asc" ? " ▲" : " ▼") : "");
  const ariaSort = (sort: SortKey) => (route.sort === sort ? (route.dir === "asc" ? "ascending" : "descending") : "none");

  const message = !found.length ? BROWSER.none : found.length > limit ? BROWSER.limited(limit, found.length) : BROWSER.shown(found.length);
  return (
    <Section id="browse" title={BROWSER.heading}>
      <div class="filters">
        <input type="search" placeholder={BROWSER.searchPlaceholder} aria-label={BROWSER.searchLabel} autocomplete="off" value={route.q} onInput={(event) => go({ q: event.currentTarget.value }, true)} />
        <label>
          {BROWSER.scopeLabel}
          <select value={route.part} onChange={(event) => go({ part: event.currentTarget.value as Part, lib: null }, true)}>
            {(["all", "game", "sdk"] as Part[]).map((part) => (
              <option key={part} value={part}>
                {BROWSER.scopes[part]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {BROWSER.targetLabel}
          <select value={route.target ?? ""} onChange={(event) => go({ target: event.currentTarget.value || null, group: null }, true)}>
            <option value="">{BROWSER.allTargets}</option>
            {model.groups.map((group) => (
              <optgroup key={group.key} label={group.label}>
                {group.targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          {BROWSER.libraryLabel}
          <select value={route.lib ?? ""} onChange={(event) => go({ lib: event.currentTarget.value || null }, true)}>
            <option value="">{BROWSER.allLibraries}</option>
            {model.libraries.map((lib) => (
              <option key={lib.name} value={lib.name}>
                {lib.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {BROWSER.sortLabel}
          <select value={route.sort} onChange={(event) => go({ sort: event.currentTarget.value as SortKey }, true)}>
            {(Object.keys(BROWSER.sorts) as SortKey[]).map((sort) => (
              <option key={sort} value={sort}>
                {BROWSER.sorts[sort]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div class="chips" role="group" aria-label={BROWSER.statusLabel}>
        {STATUSES.map((status) => (
          <button type="button" key={status} class={`chip-button${route.st.includes(status) ? " on" : ""}`} aria-pressed={route.st.includes(status)} onClick={() => toggleStatus(status)}>
            <i class="chip" style={{ "--c": statusVar(status) }} aria-hidden="true" />
            {STATUS_LABEL[status]}
          </button>
        ))}
      </div>
      <div class="browse-bar">
        <p class="mute small" id="count" aria-live="polite">
          {message}
        </p>
        <span class="browse-actions">
          {filtered ? (
            <button type="button" class="link" onClick={() => go({ q: "", st: [], part: "all", lib: null, target: null, group: null, sort: "address", dir: "asc" }, true)}>
              {BROWSER.reset}
            </button>
          ) : null}
          <button type="button" class="link" onClick={copy}>
            {copied ? BROWSER.copied : BROWSER.share}
          </button>
        </span>
      </div>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th aria-sort={ariaSort("name")}>
                <button type="button" class="th" onClick={() => sortBy("name")}>
                  {BROWSER.columns.function}
                  {arrow("name")}
                </button>
              </th>
              <th>{BROWSER.columns.target}</th>
              <th aria-sort={ariaSort("address")}>
                <button type="button" class="th" onClick={() => sortBy("address")}>
                  {BROWSER.columns.address}
                  {arrow("address")}
                </button>
              </th>
              <th aria-sort={ariaSort("status")}>
                <button type="button" class="th" onClick={() => sortBy("status")}>
                  {BROWSER.columns.status}
                  {arrow("status")}
                </button>
              </th>
              <th class="r" aria-sort={ariaSort("size")}>
                <button type="button" class="th" onClick={() => sortBy("size")}>
                  {BROWSER.columns.bytes}
                  {arrow("size")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {found.slice(0, limit).map((fn) => (
              <tr key={fn.id} class={fn.id === selected ? "selected" : ""} data-fn={fn.id}>
                <td>
                  <a href={href({ view: { kind: "fn", target: fn.target, addr: fn.addr } })}>{fn.name}</a>
                </td>
                <td class="mute">{model.targetById.get(fn.target)?.name}</td>
                <td>
                  <code>{fn.addr}</code>
                </td>
                <td>
                  <StatusChip status={fn.status} />
                </td>
                <td class="r">{number(fn.bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {found.length > limit ? (
        <button type="button" class="button" onClick={() => setShown({ key: filterKey, limit: limit + STEP })}>
          {BROWSER.more(STEP)}
        </button>
      ) : null}
    </Section>
  );
}
