import { SDK, TIER_LABEL } from "../strings.ts";
import { number, percent } from "../model/format.ts";
import { TIERS } from "../model/status.ts";
import { usePage } from "../state.tsx";
import type { Library } from "../types.ts";
import { scrollToSection } from "./Header.tsx";
import { Help, Section } from "./ui.tsx";

const versionText = (lib: Library): string =>
  Object.entries(lib.versions)
    .map(([version, units]) => `${version} ×${units}`)
    .join(" · ");

function note(lib: Library): string {
  const parts: string[] = [];
  const versions = versionText(lib);
  if (versions) parts.push(SDK.versions(versions));
  if (lib.tiers.partial) parts.push(SDK.partial(lib.tiers.partial));
  if (lib.tiers.assembly) parts.push(SDK.assemblyOnly(lib.tiers.assembly));
  if (lib.tiers.unmatched) parts.push(SDK.unmatched(lib.tiers.unmatched));
  return parts.join(" · ") || SDK.noMatch;
}

export function SdkSection() {
  const { model, href } = usePage();
  const { statuses } = model.sdk;
  const peak = Math.max(...model.libraries.map((lib) => lib.count), 1);
  return (
    <Section id="sdk" title={SDK.heading}>
      <Help>{SDK.help}</Help>
      <div class="legend" aria-hidden="true">
        {TIERS.map((tier) => (
          <span class="legend-item static" key={tier}>
            <i class="chip" style={{ "--c": `var(--tier-${tier})` }} />
            {TIER_LABEL[tier]}
          </span>
        ))}
      </div>
      <ul class="libs">
        {model.libraries.map((lib) => (
          <li key={lib.name}>
            <a class="lib-name" href={href({ lib: lib.name, part: "sdk" })} onClick={() => scrollToSection("browse")} title={SDK.browse}>
              {lib.name}
            </a>
            <div class="lib-bar" style={{ width: `${Math.max((lib.count / peak) * 100, 1)}%` }} role="img" aria-label={`${lib.name}: ${SDK.done(lib.tiers.c + lib.tiers.object, lib.count)}`}>
              {TIERS.map((tier) => (lib.tiers[tier] ? <i key={tier} style={{ width: `${percent(lib.tiers[tier], lib.count, 3)}%`, background: `var(--tier-${tier})` }} /> : null))}
            </div>
            <span class="lib-count">{SDK.done(lib.tiers.c + lib.tiers.object, lib.count)}</span>
            <span class="lib-note mute small">{note(lib)}</span>
          </li>
        ))}
      </ul>
      <p class="mute small">{SDK.keyLine(statuses.object.functions, statuses.assembly.functions, statuses.pure.functions + statuses.fake_match.functions)}</p>
    </Section>
  );
}

export { number };
