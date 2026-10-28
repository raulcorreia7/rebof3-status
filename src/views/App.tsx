// The page: the header, then the home page sections or one part or image page.

import { createMemo, createSignal, For, type JSX, onMount, Show } from "solid-js";
import { type MapRef, overviewTree, treemapOption } from "../charts/treemap.ts";
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
import { Chart, type ChartClick } from "./Chart.tsx";
import { Domains } from "./Domains.tsx";
import { GamePageView } from "./GamePage.tsx";
import { Inspector } from "./Inspector.tsx";
import { scrollToSection } from "./scroll.ts";
import { Chip, Jump } from "./ui.tsx";

/** The sections of the home page, in order: the anchor (#map) and the title, also the navigation link. */
const NAV = [
  { id: "map", title: MAP.heading },
  { id: "overview", title: SUMMARY.overviewHeading },
  { id: "find", title: BROWSER.heading },
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
    if (NAV.some((section) => section.id === id) || id === "parts" || id === "sdk") {
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
      <Section id="map" title={MAP.heading}>
        <p class="my-1 text-sm text-mute">
          {MAP.help} <Jump to={{ view: HOME.view }} scroll="parts">{MAP.detailsHeading}</Jump>.
        </p>
        <HomeMap />
      </Section>
      <Section id="overview" title={SUMMARY.overviewHeading}>
        <Cards data={cards} />
        <Meters data={meters} hideKey />
      </Section>
      <Section id="find" title={BROWSER.heading}>
        <Filters data={filters} />
        <Table data={table} />
      </Section>
      <Section id="parts" title={MAP.detailsHeading}>
        <Domains data={map} />
      </Section>
      <Section id="sdk" title={SDK.heading}>
        <Text data={sdk} />
        <p class="mt-2 text-sm text-mute">
          {HEAD.getThe} <a href="report.json">{HEAD.data}</a> {HEAD.or}{" "}
          <a href="progress.png">{HEAD.picture}</a>.
        </p>
      </Section>
    </>
  );
}

function HomeMap() {
  const page = usePage();
  const [by, setBy] = createSignal<"part" | "image">("part");
  const option = createMemo(() =>
    treemapOption(
      overviewTree(
        page.model,
        page.tokens,
        by(),
        Math.min(window.innerWidth - 32, 992),
        window.innerWidth < 700 ? 600 : 540,
      ),
      page.tokens,
    )
  );
  const onClick = (params: ChartClick) => {
    const ref = params.data?.ref as MapRef | undefined;
    if (ref?.kind === "part") page.go({ view: { kind: "part", key: ref.id }, fn: null });
    else if (ref?.kind === "image") page.go({ view: { kind: "image", id: ref.id }, fn: null });
    else if (ref?.kind === "sdk") page.go({ view: HOME.view }, false, "sdk");
  };
  return (
    <>
      <div class="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Map view">
        <button
          type="button"
          class="btn"
          aria-pressed={by() === "part"}
          onClick={() => setBy("part")}
        >
          By game part
        </button>
        <button
          type="button"
          class="btn"
          aria-pressed={by() === "image"}
          onClick={() => setBy("image")}
        >
          By image
        </button>
      </div>
      <ul class="my-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li>{MAP.shading}</li>
        <li>
          <Chip color={page.tokens.sdk} />
          {SDK.group}
        </li>
      </ul>
      <Chart
        option={option()}
        height={window.innerWidth < 700 ? 600 : 540}
        label={MAP.homeChartLabel}
        onClick={onClick}
        replace
      />
    </>
  );
}

function Section(props: { id: string; title: string; children: JSX.Element }) {
  return (
    <section
      id={props.id}
      class="mt-6 scroll-mt-3 focus:outline-none"
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
