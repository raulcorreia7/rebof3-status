import { GROUPS } from "../strings.ts";
import { number, percent } from "../model/format.ts";
import { usePage } from "../state.tsx";
import { scrollToSection } from "./Header.tsx";
import { Section, StatusMeter } from "./ui.tsx";
import { Help } from "./ui.tsx";

export function Groups() {
  const { model, href } = usePage();
  return (
    <Section id="groups" title={GROUPS.heading}>
      <Help>{GROUPS.intro}</Help>
      <div class="group-grid">
        {model.groups.map((group) => (
          <article class="card group" key={group.key} data-group={group.key}>
            <header>
              <h3>{group.label}</h3>
              <div class="card-big small-big">{percent(group.done, group.count, 1)}%</div>
            </header>
            <p class="mute small">{group.note}</p>
            <StatusMeter tally={group} label={`${group.label}: ${GROUPS.functions(group.done, group.count)}`} />
            <p class="small">
              {GROUPS.functions(group.done, group.count)} · {GROUPS.targets(group.targets.length)} · {number(group.bytes)} B
            </p>
            <ul class="target-list">
              {group.targets.map((target) => (
                <li key={target.id}>
                  <a href={href({ view: { kind: "target", id: target.id } })} onClick={() => scrollToSection("map")}>
                    {target.name}
                  </a>
                  <span class="mute small">{target.game.count ? `${percent(target.game.done, target.game.count, 0)}%` : "data only"}</span>
                </li>
              ))}
            </ul>
            <a class="button" href={href({ view: { kind: "group", key: group.key }, map: "tiles" })} onClick={() => scrollToSection("map")}>
              {GROUPS.open}
            </a>
          </article>
        ))}
      </div>
    </Section>
  );
}
