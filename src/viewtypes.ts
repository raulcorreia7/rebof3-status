// The data each kind of view draws. A selector (selectors.ts) turns the model and the route into
// one of these; a view (views/) draws it. Nothing here knows about the framework.

import type { ChartOption } from "./charts/register.ts";
import type { MapNode } from "./charts/treemap.ts";
import type { Route, SortKey } from "./model/route.ts";
import type { Tokens } from "./theme/tokens.ts";
import type { Fn, Model, Status } from "./types.ts";

/** What a selector reads. The page state satisfies it. */
export interface Ctx {
  model: Model;
  route: Route;
  tokens: Tokens;
  /** How many rows of the function table are shown. */
  limit: number;
}

/** A link to another view of the page; `scroll` is the section to scroll to after the jump. */
export interface Link {
  label: string;
  to: Partial<Route>;
  scroll?: string;
}

/** A piece of inline content. A part with `to` or `url` is a link. */
export interface Part {
  text: string;
  to?: Partial<Route>;
  scroll?: string;
  url?: string;
  code?: boolean;
  mute?: boolean;
  status?: Status;
  /** Start on a new line. */
  br?: boolean;
}

export interface MeterRow {
  name?: Link;
  /** A name that is not a link, for a row with nothing to open. */
  label?: string;
  aria: string;
  /** Width of the whole bar as a percentage of the track. */
  width?: number;
  /** Segments in order; `width` is a percentage of the bar. */
  parts: { width: string; color: string }[];
  count?: string;
  note?: string;
}

export interface Card {
  id: string;
  title: string;
  big: string;
  sub?: string;
  color?: string;
}

export interface Views {
  cards: { cards: Card[] };
  meters: { key?: { label: string; color: string }[]; rows: MeterRow[] };
  text: { paragraphs: { label?: string; text: string }[] };
  /** Status filter chips. */
  legend: { label: string; items: { key: Status; label: string; color: string }[] };
  /** Game code by part of the game: a heading and a bar per group, then its images as rows or tiles. */
  domains: {
    key: { label: string; color: string; sub: string }[];
    /** What the statuses mean, under the key. */
    keyHelp: string;
    /** All game code, under the key. */
    meter: MeterRow;
    groups: {
      key: string;
      title: Link;
      note: string;
      percent: string;
      line: string;
      meter: MeterRow;
      tiles: boolean;
      images: {
        id: string;
        /** Full name for a row, short name for a tile (`AREA037 · 13`). */
        label: string;
        line: string;
        size: string;
        aria: string;
        /** Bar length as a share of the group's biggest image; rows only. */
        width: number;
        parts: MeterRow["parts"];
        to: Partial<Route>;
      }[];
    }[];
  };
  trend: { charts: { id: string; title: string; value: string | null; option: ChartOption | null }[]; empty: string };
  filters: {
    search: { label: string; placeholder: string };
    selects: {
      label: string;
      field: "part" | "target" | "lib" | "sort";
      options: { value: string; label: string; group?: string }[];
      /** The value of the first option means "no filter" (null in the route). */
      any: boolean;
      /** Route changes that go with a new value. */
      also?: Partial<Route>;
    }[];
  };
  table: {
    columns: { label: string; align?: "r"; sort?: SortKey }[];
    rows: { id: string; cells: Part[][] }[];
    /** Text for the line above the table. */
    message?: string;
    /** Show the clear-filters and copy-link actions. */
    actions?: { canReset: boolean };
    /** More rows can be shown. */
    more?: string;
    /** Wrap the table in a closed disclosure with this summary. */
    disclosure?: string;
  };
  inspector: { title: string; fields: { label: string; value: Part[] }[]; message?: string } | null;
}

export type ViewKind = keyof Views;

/** A part of the game or an image page: its counts, then its functions as a treemap and a list. */
export interface GamePage {
  title: string;
  /** From the map down to this page; the last one is the page itself. */
  crumbs: Link[];
  found: boolean;
  /** Why the page is empty. */
  message?: string;
  percent: string;
  line: string;
  meter: MeterRow | null;
  key: { label: string; color: string; sub: string }[];
  note: string;
  facts: { label: string; value: Part[] }[];
  /** Says how the report's functions differ from the counts; empty when they agree. */
  coverage: string;
  tree: MapNode | null;
  /** The report's game functions, the treemap's leaves. */
  functions: Fn[];
  /** The page holds several images, so each function names its image. */
  inPart: boolean;
}
export type Copy = string | ((c: Ctx) => string);

/** One block of a section: a view, the selector that feeds it, and the text around it. */
export type Block = {
  [K in ViewKind]: {
    view: K;
    select: (c: Ctx) => Views[K];
    /** Small heading, help text before the view, and a muted note after it. */
    heading?: Copy;
    help?: Copy;
    note?: Copy;
    /** The block is skipped when this returns false. */
    when?: (c: Ctx) => boolean;
  };
}[ViewKind];

export interface Section {
  id: string;
  /** The heading, and the section's link in the page navigation. */
  title: string;
  /** `aside` sections sit beside the page instead of in it. */
  where?: "main" | "aside";
  blocks: Block[];
}
