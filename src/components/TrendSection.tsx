import { useMemo } from "preact/hooks";
import { TREND } from "../strings.ts";
import { TREND_CHARTS } from "../model/history.ts";
import { latest, trendOption } from "../charts/trend.ts";
import { usePage } from "../state.tsx";
import { EChart } from "./EChart.tsx";
import { Help, Section } from "./ui.tsx";

export function TrendSection() {
  const { model, tokens } = usePage();
  const charts = useMemo(
    () => TREND_CHARTS.map((chart) => ({ chart, value: latest(model.history, chart), option: trendOption(model.history, chart, tokens) })),
    [model, tokens],
  );
  return (
    <Section id="trend" title={TREND.heading}>
      <Help>{TREND.help}</Help>
      <div class="trend-grid">
        {charts.map(({ chart, value, option }) => (
          <figure key={chart.id} data-chart={chart.id}>
            <figcaption>{value ? `${chart.title}: ${value}` : chart.title}</figcaption>
            {option ? <EChart option={option} height={170} label={`${chart.title}, latest ${value}`} /> : <p class="empty mute small">{TREND.empty}</p>}
          </figure>
        ))}
      </div>
    </Section>
  );
}
