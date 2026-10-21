import { SUMMARY } from "../strings.ts";
import { number, percent } from "../model/format.ts";
import { usePage } from "../state.tsx";
import { Help, Section, StatusMeter } from "./ui.tsx";

interface Card {
  stat: string;
  big: string;
  title: string;
  sub: string;
  color: string;
}

export function Summary() {
  const { model } = usePage();
  const { game, sdk, data } = model.summary;
  const cards: Card[] = [
    {
      stat: "game",
      big: `${percent(game.done_functions, game.functions, 1)}%`,
      title: `${SUMMARY.gameFunctions}*`,
      sub: SUMMARY.of(game.done_functions, game.functions),
      color: "var(--st-pure)",
    },
    {
      stat: "game-bytes",
      big: `${percent(game.done_bytes, game.bytes, 1)}%`,
      title: SUMMARY.gameBytes,
      sub: SUMMARY.ofBytes(game.done_bytes, game.bytes),
      color: "var(--st-pure)",
    },
    {
      stat: "sdk",
      big: `${percent(sdk.done_functions, sdk.functions, 1)}%`,
      title: SUMMARY.sdk,
      sub: SUMMARY.of(sdk.done_functions, sdk.functions),
      color: "var(--st-object)",
    },
    data
      ? {
          stat: "data",
          big: `${percent(data.typed, data.bytes, 2)}%`,
          title: SUMMARY.data,
          sub: SUMMARY.ofBytes(data.typed, data.bytes),
          color: "var(--st-typed)",
        }
      : { stat: "data", big: SUMMARY.dataPending[0], title: SUMMARY.data, sub: SUMMARY.dataPending[1], color: "var(--mute)" },
  ];
  return (
    <Section id="overview" title="Overview">
      <div class="cards">
        {cards.map((card) => (
          <div class="card" key={card.stat} data-card={card.stat}>
            <div class="card-title">{card.title}</div>
            <div class="card-big" style={{ color: card.color }}>
              {card.big}
            </div>
            <div class="mute small">{card.sub}</div>
          </div>
        ))}
      </div>
      <Help>{SUMMARY.footnote}</Help>
      <h3>{SUMMARY.statusHeading}</h3>
      <StatusMeter tally={model.all} label={SUMMARY.statusHeading} />
    </Section>
  );
}
