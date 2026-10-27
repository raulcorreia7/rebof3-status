// The data each kind of view draws. A selector (selectors.ts) turns the model and the route into
// one of these; a view (views/) draws it. Nothing here knows about the framework.

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
}

export interface MeterRow {
  /** Visible caption above the bar. */
  label?: string;
  aria: string;
  /** Segments in order; `width` is a percentage of the bar. */
  parts: { width: string; color: string }[];
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
  meters: { key?: { label: string; color: string; sub: string }[]; rows: MeterRow[] };
  text: { paragraphs: { label?: string; text: string }[] };
  /** Game code by part of the game: a heading and a bar per group, then its images as rows or tiles. */
  domains: {
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
  filters: { search: { label: string; hint: string; placeholder: string } };
  table: {
    columns: { label: string; align?: "r"; sort?: SortKey }[];
    rows: { id: string; cells: Part[][] }[];
    /** Text for the line above the table; empty while there is no search. */
    message: string;
    /** More rows can be shown. */
    more?: string;
  };
  inspector: { title: string; fields: { label: string; value: Part[] }[]; message?: string } | null;
}

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
  tree: MapNode | null;
  /** The report's game functions, the treemap's leaves. */
  functions: Fn[];
  /** The page holds several images, so each function names its image. */
  inPart: boolean;
}
