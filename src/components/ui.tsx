// Small pieces several sections share.

import type { ComponentChildren } from "preact";
import { STATUS_LABEL } from "../strings.ts";
import { percent as pct } from "../model/format.ts";
import { STATUSES } from "../model/status.ts";
import type { Status, Tally } from "../types.ts";

export const StatusChip = ({ status }: { status: Status }) => (
  <span class="status">
    <i class="chip" style={{ "--c": `var(--st-${status.replace("_", "-")})` }} aria-hidden="true" />
    {STATUS_LABEL[status]}
  </span>
);

export const statusVar = (status: string): string => `var(--st-${status.replace("_", "-")})`;

/** One bar split by status, by function count. */
export function StatusMeter({ tally, label }: { tally: Tally; label: string }) {
  return (
    <div class="meter" role="img" aria-label={label}>
      {STATUSES.map((status) => {
        const count = tally.statuses[status].functions;
        return count ? <i key={status} style={{ width: `${pct(count, tally.count, 3)}%`, background: statusVar(status) }} /> : null;
      })}
    </div>
  );
}

/** A bar with one filled part. */
export const Bar = ({ value, total, color, label }: { value: number; total: number; color: string; label: string }) => (
  <div class="meter" role="img" aria-label={label}>
    <i style={{ width: `${pct(value, total, 3)}%`, background: color }} />
  </div>
);

export const Section = ({ id, title, children }: { id: string; title: ComponentChildren; children: ComponentChildren }) => (
  <section id={id} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{title}</h2>
    {children}
  </section>
);

export const Help = ({ children }: { children: ComponentChildren }) => <p class="mute small">{children}</p>;
