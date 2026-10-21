import { useMemo } from "preact/hooks";
import { barOption, BAR_HEIGHT } from "../charts/bars.ts";
import { DATA } from "../strings.ts";
import { number, percent } from "../model/format.ts";
import { usePage } from "../state.tsx";
import { EChart } from "./EChart.tsx";
import { Help, Section } from "./ui.tsx";

export function DataSection() {
  const { model, tokens } = usePage();
  const rows = useMemo(() => model.targets.filter((t) => t.data && t.data.bytes).sort((a, b) => b.data!.bytes - a.data!.bytes), [model]);
  const option = useMemo(
    () =>
      barOption(
        {
          categories: rows.map((t) => t.name),
          normalize: true,
          series: [
            { name: DATA.typed, color: tokens.status.pure, values: rows.map((t) => (100 * t.data!.typed) / t.data!.bytes) },
            { name: DATA.untyped, color: tokens.track, values: rows.map((t) => (100 * (t.data!.bytes - t.data!.typed)) / t.data!.bytes) },
          ],
          describe: (i) => `<b>${rows[i].name}</b><br>${percent(rows[i].data!.typed, rows[i].data!.bytes, 1)}% · ${number(rows[i].data!.typed)} / ${number(rows[i].data!.bytes)} B`,
        },
        tokens,
      ),
    [rows, tokens],
  );
  const total = model.data;
  return (
    <Section id="data" title={total ? DATA.heading(percent(total.typed, total.bytes), total.typed, total.bytes) : DATA.headingNone}>
      <Help>{DATA.help}</Help>
      {rows.length ? <EChart option={option} height={rows.length * BAR_HEIGHT + 30} label={DATA.help} /> : null}
    </Section>
  );
}
