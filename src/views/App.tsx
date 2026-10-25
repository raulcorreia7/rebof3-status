// The page: the header, then the section registry drawn in order.

import { createMemo, For, Show, type Component } from "solid-js";
import { SECTIONS } from "../sections.ts";
import { FOOT, HEAD } from "../strings.ts";
import { commitUrl } from "../model/index.ts";
import { createPage, PageProvider, usePage } from "../state.ts";
import type { Mode } from "../theme/apply.ts";
import type { Model } from "../types.ts";
import type { Block, Copy, Section, ViewKind, Views } from "../viewtypes.ts";
import { ChartView, Cards, Filters, Legend, Meters, Table, Tabs, Text, Trend } from "./Basic.tsx";
import { Domains } from "./Domains.tsx";
import { Inspector } from "./Inspector.tsx";
import { scrollToSection } from "./scroll.ts";
import { Treemap } from "./Treemap.tsx";

type ViewMap = { [K in ViewKind]: Component<{ data: () => Views[K] }> };
const VIEWS: ViewMap = {
  cards: Cards,
  meters: Meters,
  text: Text,
  legend: Legend,
  tabs: Tabs,
  domains: Domains,
  treemap: Treemap,
  chart: ChartView,
  trend: Trend,
  filters: Filters,
  table: Table,
  inspector: Inspector,
};

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
  return (
    <>
      <a
        class="absolute top-0 -left-250 z-30 bg-card px-3 py-2 focus:top-2 focus:left-2"
        href="#overview"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("overview")?.focus();
        }}
      >
        Skip to the overview
      </a>
      <div class="flex items-start">
        {/* Below xl the inspector is a sheet over the bottom of the page; leave room to scroll past it. */}
        <main id="content" class={`mx-auto max-w-5xl min-w-0 flex-1 px-4 pt-5 pb-16 ${page.route.view.kind !== "home" ? "max-xl:pb-[64vh]" : ""}`}>
          <Header />
          <For each={SECTIONS.filter((section) => section.where !== "aside")}>{(section) => <SectionView section={section} />}</For>
          <p class="mt-10 text-sm text-mute">
            {FOOT.generated} <a href="report.json">report.json</a>
            {FOOT.doNotEdit}
          </p>
        </main>
        <For each={SECTIONS.filter((section) => section.where === "aside")}>{(section) => <For each={section.blocks}>{(block) => <BlockView block={block} />}</For>}</For>
      </div>
    </>
  );
}

function Header() {
  const page = usePage();
  return (
    <header>
      <div class="flex items-start justify-between gap-3">
        <h1 class="text-2xl leading-tight font-bold max-sm:text-xl">{HEAD.title}</h1>
        <button type="button" class="btn" onClick={() => page.setMode(NEXT[page.mode])} aria-label={HEAD.theme[page.mode]} title={HEAD.theme[page.mode]}>
          {HEAD.theme[page.mode]}
        </button>
      </div>
      <p class="mt-1 text-mute">
        {HEAD.updated} {page.model.meta.date} {HEAD.from}{" "}
        <a href={commitUrl(page.model.meta.commit)}>
          <code>{page.model.meta.shortCommit}</code>
        </a>
        . {HEAD.getThe} <a href="report.json">{HEAD.data}</a> {HEAD.or} <a href="progress.png">{HEAD.picture}</a>.
      </p>
      <nav class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Sections">
        <For each={SECTIONS.filter((section) => section.nav)}>
          {(section) => (
            <a
              href={`#${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(section.id);
              }}
            >
              {section.nav}
            </a>
          )}
        </For>
      </nav>
    </header>
  );
}

const copy = (value: Copy | undefined, page: ReturnType<typeof usePage>) => (typeof value === "function" ? value(page) : value);

function SectionView(props: { section: Section }) {
  const page = usePage();
  const id = props.section.id;
  return (
    <section id={id} class="mt-10 scroll-mt-3 focus:outline-none" aria-labelledby={`${id}-title`} tabindex="-1">
      <h2 id={`${id}-title`} class="mb-1 text-xl font-semibold">
        {copy(props.section.title, page)}
      </h2>
      <For each={props.section.blocks}>{(block) => <BlockView block={block} />}</For>
    </section>
  );
}

function BlockView(props: { block: Block }) {
  const page = usePage();
  const block = props.block;
  return (
    <Show when={!block.when || block.when(page)}>
      <Body block={block} />
    </Show>
  );
}

function Body(props: { block: Block }) {
  const page = usePage();
  const block = props.block;
  const data = createMemo(() => block.select(page));
  const View = VIEWS[block.view] as Component<{ data: () => unknown }>;
  return (
    <>
      <Show when={copy(block.heading, page)}>{(heading) => <h3 class="mt-5 mb-1 font-semibold">{heading()}</h3>}</Show>
      <Show when={copy(block.help, page)}>{(help) => <p class="my-1 text-sm text-mute">{help()}</p>}</Show>
      <View data={data} />
      <Show when={copy(block.note, page)}>{(note) => <p class="my-1 text-sm text-mute">{note()}</p>}</Show>
    </>
  );
}
