// The page: the header, then the section registry drawn in order.

import { createMemo, For, onMount, Show, type Component } from "solid-js";
import { SECTIONS } from "../sections.ts";
import { FOOT, HEAD } from "../strings.ts";
import { HOME } from "../model/route.ts";
import { createPage, PageProvider, usePage } from "../state.ts";
import type { Mode } from "../theme/apply.ts";
import type { Model } from "../types.ts";
import type { Block, Copy, Section, ViewKind, Views } from "../viewtypes.ts";
import { Cards, Filters, Meters, Table, Text } from "./Basic.tsx";
import { Domains } from "./Domains.tsx";
import { Inspector } from "./Inspector.tsx";
import { scrollToSection } from "./scroll.ts";
import { gamePage } from "../selectors.ts";
import { GamePageView } from "./GamePage.tsx";
import { Jump } from "./ui.tsx";

type ViewMap = { [K in ViewKind]: Component<{ data: () => Views[K] }> };
const VIEWS: ViewMap = {
  cards: Cards,
  meters: Meters,
  text: Text,
  domains: Domains,
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
  const gamePageData = createMemo(() => gamePage(page));
  const inspectorOpen = () => !!page.route.fn;
  const main = SECTIONS.filter((section) => section.where !== "aside");
  // A link to a section (#map, #browse) opens the home page at that section.
  onMount(() => {
    const id = window.location.hash.slice(1);
    if (main.some((section) => section.id === id)) requestAnimationFrame(() => scrollToSection(id, false));
  });
  return (
    <>
      <a class="absolute top-0 -left-250 z-30 bg-card px-3 py-2 focus:top-2 focus:left-2" href="#content">
        {HEAD.skip}
      </a>
      <div class="flex items-start">
        <main id="content" tabIndex={-1} class={`mx-auto max-w-5xl min-w-0 flex-1 px-4 pt-5 pb-16 focus:outline-none ${inspectorOpen() ? "max-xl:pb-[64vh]" : ""}`}>
          <Header />
          <Show when={gamePageData()} fallback={<For each={main}>{(section) => <SectionView section={section} />}</For>}>
            {(data) => <GamePageView data={data} />}
          </Show>
          <p class="mt-10 text-sm text-mute">{FOOT.text}</p>
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
        {HEAD.getThe} <a href="report.json">{HEAD.data}</a> {HEAD.or} <a href="progress.png">{HEAD.picture}</a>.
      </p>
      <nav class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={HEAD.sections}>
        <For each={SECTIONS.filter((section) => section.where !== "aside")}>
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

const copy = (value: Copy | undefined, page: ReturnType<typeof usePage>) => (typeof value === "function" ? value(page) : value);

function SectionView(props: { section: Section }) {
  const id = props.section.id;
  return (
    <section id={id} class="mt-10 scroll-mt-3 focus:outline-none" aria-labelledby={`${id}-title`} tabindex="-1">
      <h2 id={`${id}-title`} class="mb-1 text-xl font-semibold">
        {props.section.title}
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
