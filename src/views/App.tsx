// The page: the header, then the home page sections or one part or image page.

import { createMemo, For, type JSX, onMount, Show } from "solid-js";
import { inspector } from "../inspect.ts";
import { HOME } from "../model/route.ts";
import {
  apart,
  domains,
  gamePage,
  overviewCards,
  overviewMeter,
  search,
  searchTable,
} from "../selectors.ts";
import { createPage, PageProvider, usePage } from "../state.ts";
import { BROWSER, FOOT, HEAD, MAP, SDK, SUMMARY } from "../strings.ts";
import type { Mode } from "../theme/apply.ts";
import type { Model } from "../types.ts";
import { Cards, Filters, Meters, Table, Text } from "./Basic.tsx";
import { Domains } from "./Domains.tsx";
import { GamePageView } from "./GamePage.tsx";
import { Inspector } from "./Inspector.tsx";
import { scrollToSection } from "./scroll.ts";
import { Jump } from "./ui.tsx";

/** The sections of the home page, in order: the anchor (#map) and the title, also the navigation link. */
const NAV = [
  { id: "overview", title: SUMMARY.overviewHeading },
  { id: "find", title: BROWSER.heading },
  { id: "map", title: MAP.heading },
  { id: "sdk", title: SDK.heading },
];

const NEXT: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };

export function App(props: { model: Model }) {
  const page = createPage(props.model);
  return (
    <PageProvider value={page}>
      <Layout />
    </PageProvider>
  );
}

function Layout() {
  const page = usePage();
  const gamePageData = createMemo(() => gamePage(page));
  const inspectorOpen = () => !!page.route.fn;
  const inspectorData = createMemo(() => inspector(page));
  // A link to a section (#map, #find) opens the home page at that section.
  onMount(() => {
    const id = window.location.hash.slice(1);
    if (NAV.some((section) => section.id === id)) {
      requestAnimationFrame(() => scrollToSection(id, false));
    }
  });
  return (
    <>
      <a
        class="absolute top-0 -left-250 z-30 bg-card px-3 py-2 focus:top-2 focus:left-2"
        href="#content"
      >
        {HEAD.skip}
      </a>
      <div class="flex items-start">
        <main
          id="content"
          tabIndex={-1}
          class={`mx-auto max-w-5xl min-w-0 flex-1 px-4 pt-5 pb-16 focus:outline-none ${
            inspectorOpen() ? "max-xl:pb-[64vh]" : ""
          }`}
        >
          <Header />
          <Show when={gamePageData()} fallback={<Sections />}>
            {(data) => <GamePageView data={data} />}
          </Show>
          <p class="mt-10 text-sm text-mute">{FOOT.text}</p>
        </main>
        <Inspector data={inspectorData} />
      </div>
    </>
  );
}

function Header() {
  const page = usePage();
  return (
    <header>
      <div class="flex items-start justify-between gap-3">
        <h1 class="text-2xl leading-tight font-bold max-sm:text-xl">
          <Jump class="text-ink hover:no-underline" to={{ view: HOME.view }}>
            {HEAD.title}
          </Jump>
        </h1>
        <button type="button" class="btn" onClick={() => page.setMode(NEXT[page.mode])}>
          {HEAD.theme[page.mode]}
        </button>
      </div>
      <p class="mt-1 text-mute">
        {HEAD.getThe} <a href="report.json">{HEAD.data}</a> {HEAD.or}{" "}
        <a href="progress.png">{HEAD.picture}</a>.
      </p>
      <nav class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={HEAD.sections}>
        <For each={NAV}>
          {(section) => (
            <Jump to={{ view: HOME.view }} scroll={section.id}>
              {section.title}
            </Jump>
          )}
        </For>
      </nav>
    </header>
  );
}

function Sections() {
  const page = usePage();
  const cards = createMemo(() => overviewCards(page));
  const meters = createMemo(() => overviewMeter(page));
  const filters = createMemo(() => search());
  const table = createMemo(() => searchTable(page));
  const map = createMemo(() => domains(page));
  const sdk = createMemo(() => apart(page));
  return (
    <>
      <Section id="overview" title={SUMMARY.overviewHeading}>
        <Cards data={cards} />
        <Meters data={meters} />
      </Section>
      <Section id="find" title={BROWSER.heading}>
        <Filters data={filters} />
        <Table data={table} />
      </Section>
      <Section id="map" title={MAP.heading}>
        <p class="my-1 text-sm text-mute">{MAP.help}</p>
        <Domains data={map} />
      </Section>
      <Section id="sdk" title={SDK.heading}>
        <Text data={sdk} />
      </Section>
    </>
  );
}

function Section(props: { id: string; title: string; children: JSX.Element }) {
  return (
    <section
      id={props.id}
      class="mt-10 scroll-mt-3 focus:outline-none"
      aria-labelledby={`${props.id}-title`}
      tabindex="-1"
    >
      <h2 id={`${props.id}-title`} class="mb-1 text-xl font-semibold">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}
