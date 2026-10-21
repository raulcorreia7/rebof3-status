// The status legend. It doubles as the status filter of the map and the function browser.

import { MAP, STATUS_LABEL, SUMMARY } from "../strings.ts";
import { percent } from "../model/format.ts";
import { STATUSES } from "../model/status.ts";
import { usePage } from "../state.tsx";
import type { Status } from "../types.ts";
import { statusVar } from "./ui.tsx";

export function Legend({ counts = false }: { counts?: boolean }) {
  const { route, go, model } = usePage();
  const totals = model.summary.code;
  const toggle = (status: Status) => go({ st: route.st.includes(status) ? route.st.filter((key) => key !== status) : [...route.st, status] }, true);
  return (
    <div class="legend-block">
      <div class="legend" role="group" aria-label={MAP.filterHelp}>
        {STATUSES.map((status) => {
          const [functions, bytes] = totals.statuses[status];
          const on = route.st.includes(status);
          return (
            <button type="button" key={status} class={`legend-item${on ? " on" : ""}${route.st.length && !on ? " off" : ""}`} aria-pressed={on} onClick={() => toggle(status)}>
              <i class="chip" style={{ "--c": statusVar(status) }} aria-hidden="true" />
              <span>
                {STATUS_LABEL[status]}
                {counts ? <small>{SUMMARY.statusLine(functions, percent(bytes, totals.bytes, 1))}</small> : null}
              </span>
            </button>
          );
        })}
      </div>
      <p class="mute small">
        {MAP.filterHelp}{" "}
        {route.st.length ? (
          <button type="button" class="link" onClick={() => go({ st: [] }, true)}>
            {MAP.filterClear}
          </button>
        ) : null}
      </p>
    </div>
  );
}
