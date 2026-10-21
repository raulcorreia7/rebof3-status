import { HEAD } from "../strings.ts";
import { commitUrl } from "../model/index.ts";
import { usePage } from "../state.tsx";
import type { Mode } from "../theme/apply.ts";

const NEXT: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };
const NAV: [string, string][] = [
  ["overview", "Overview"],
  ["map", "Map"],
  ["sdk", "PsyQ SDK"],
  ["data", "Data"],
  ["quality", "Quality"],
  ["trend", "Trend"],
  ["browse", "Functions"],
];

export function Header() {
  const { model, mode, setMode } = usePage();
  return (
    <header>
      <div class="head-row">
        <h1>{HEAD.title}</h1>
        <button type="button" class="ghost" onClick={() => setMode(NEXT[mode])} aria-label={HEAD.theme[mode]} title={HEAD.theme[mode]}>
          {HEAD.theme[mode]}
        </button>
      </div>
      <p class="mute">
        {HEAD.updated} {model.meta.date} {HEAD.from} <a href={commitUrl(model.meta.commit)}><code>{model.meta.shortCommit}</code></a>. {HEAD.getThe} <a href="progress.json">{HEAD.data}</a> {HEAD.or}{" "}
        <a href="progress.png">{HEAD.picture}</a>.
      </p>
      <nav aria-label="Sections">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(event) => jump(event, id)}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}

/** Scroll to a section without changing the hash, which carries the page state. */
export function jump(event: Event, id: string): void {
  event.preventDefault();
  scrollToSection(id);
}

export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  target.focus({ preventScroll: true });
}
