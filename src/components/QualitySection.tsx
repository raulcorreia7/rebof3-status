import { useMemo } from "preact/hooks";
import { barOption, BAR_HEIGHT } from "../charts/bars.ts";
import { QUALITY } from "../strings.ts";
import { hex } from "../model/format.ts";
import { usePage } from "../state.tsx";
import { EChart } from "./EChart.tsx";
import { Help, Section } from "./ui.tsx";

export function QualitySection() {
  const { model, tokens, href } = usePage();
  const q = model.quality;
  const withFakes = useMemo(
    () => model.targets.filter((t) => t.all.statuses.fake_match.functions).sort((a, b) => b.all.statuses.fake_match.functions - a.all.statuses.fake_match.functions),
    [model],
  );
  const option = useMemo(
    () =>
      barOption(
        { categories: withFakes.map((t) => t.name), unit: "functions", series: [{ name: "fake-match functions", color: tokens.status.fake_match, values: withFakes.map((t) => t.all.statuses.fake_match.functions) }] },
        tokens,
      ),
    [withFakes, tokens],
  );
  const { links, layout } = model;
  const differing = model.targets.filter((t) => t.link && t.link.status !== "EXACT");
  const names = differing.map((t) => (t.link?.first_mismatch != null ? `${t.id} (${QUALITY.firstDifference(hex(t.base + t.link.first_mismatch))})` : t.id));
  const audit = QUALITY.addressMap(layout) + (layout.relocated || layout.unmodelled || layout.resized ? QUALITY.addressMapNotes(layout) : "");
  return (
    <Section id="quality" title={QUALITY.heading}>
      <div class="cards five">
        {QUALITY.cards(q).map(([name, value, sub]) => (
          <div class="card" key={name}>
            <div class="card-title">{name}</div>
            <div class="card-big small-big">{value}</div>
            <div class="mute small">{sub}</div>
          </div>
        ))}
      </div>
      <Help>{QUALITY.sentence(q)}</Help>
      <h3>{QUALITY.perTargetHeading}</h3>
      <Help>{QUALITY.perTargetHelp}</Help>
      {withFakes.length ? <EChart option={option} height={withFakes.length * BAR_HEIGHT + 30} label={QUALITY.perTargetHeading} /> : null}
      <h3>{QUALITY.verifyHeading}</h3>
      <p class="small">
        <b>Image links:</b> {links ? QUALITY.imageLinks(links.exact, links.targets) + (names.length ? QUALITY.differs(names) : ".") : QUALITY.imageLinksUnknown}
      </p>
      <p class="small">
        <b>Address map:</b> {audit}
      </p>
      <details>
        <summary>Image link and map audit of each target</summary>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>Target</th>
                <th>Address range</th>
                <th class="r">Bytes</th>
                <th>Image link</th>
                <th>Map audit</th>
              </tr>
            </thead>
            <tbody>
              {model.targets.map((t) => {
                const notes = [t.layout.gaps.length && `${t.layout.gaps.length} gaps`, t.layout.overlaps.length && `${t.layout.overlaps.length} overlaps`, t.layout.problems.length && `${t.layout.problems.length} problems`].filter(Boolean);
                return (
                  <tr key={t.id}>
                    <td>
                      <a href={href({ view: { kind: "target", id: t.id } })}>{t.name}</a>
                      <br />
                      <code class="mute">{t.id}</code>
                    </td>
                    <td>
                      <code>
                        {hex(t.base)}-{hex(t.end)}
                      </code>
                    </td>
                    <td class="r">{t.size.toLocaleString("en-US")}</td>
                    <td>{t.link ? <span class={`pill ${t.link.status === "EXACT" ? "ok" : "bad"}`}>{t.link.status}</span> : <span class="mute">not linked</span>}</td>
                    <td>{notes.length ? notes.join(", ") : "clean"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </Section>
  );
}
