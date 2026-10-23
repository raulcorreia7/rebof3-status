// The page, as data. App draws this list in order: to add, remove or reorder a section, edit it.
//
// A section has an id (its anchor), a title and an optional navigation label. Its blocks are
// drawn top to bottom. Each block names a view kind (cards, meters, text, legend, tabs, treemap,
// chart, trend, filters, table, inspector), the selector that feeds it from the model and the
// route (selectors.ts, inspect.ts), and the copy around it, all from strings.ts.

import { inspector } from "./inspect.ts";
import * as pick from "./selectors.ts";
import { BROWSER, DATA, GROUPS, MAP, QUALITY, SDK, SUMMARY, TREND } from "./strings.ts";
import type { Section } from "./viewtypes.ts";

export const SECTIONS: Section[] = [
  {
    id: "overview",
    nav: "Overview",
    title: "Overview",
    blocks: [
      { view: "cards", select: pick.overviewCards, note: SUMMARY.footnote },
      { view: "text", select: pick.apart },
      { view: "meters", select: pick.overviewMeter, heading: SUMMARY.statusHeading },
    ],
  },
  {
    id: "groups",
    title: GROUPS.heading,
    blocks: [{ view: "cards", select: pick.groupCards, help: GROUPS.intro }],
  },
  {
    id: "map",
    nav: "Map",
    title: MAP.heading,
    blocks: [
      { view: "tabs", select: pick.mapTabs },
      { view: "legend", select: pick.legend, heading: pick.mapHeading, help: pick.mapHelp },
      { view: "treemap", select: pick.mapTreemap, note: MAP.textFallback },
    ],
  },
  {
    id: "sdk",
    nav: "PsyQ SDK",
    title: SDK.heading,
    blocks: [{ view: "meters", select: pick.sdkLibraries, help: SDK.help, note: pick.sdkKeyLine }],
  },
  {
    id: "data",
    nav: "Data",
    title: pick.dataHeading,
    blocks: [{ view: "chart", select: pick.dataChart, help: DATA.help }],
  },
  {
    id: "quality",
    nav: "Quality",
    title: QUALITY.heading,
    blocks: [
      { view: "cards", select: pick.qualityCards, note: (c) => QUALITY.sentence(c.model.quality) },
      { view: "chart", select: pick.rebuildChart, heading: QUALITY.perTargetHeading, help: QUALITY.perTargetHelp },
      { view: "text", select: pick.verification, heading: QUALITY.verifyHeading },
      { view: "table", select: pick.auditTable },
    ],
  },
  {
    id: "trend",
    nav: "Trend",
    title: TREND.heading,
    blocks: [{ view: "trend", select: pick.trend, help: TREND.help }],
  },
  {
    id: "browse",
    nav: "Functions",
    title: BROWSER.heading,
    blocks: [
      { view: "filters", select: pick.browserFilters },
      { view: "legend", select: pick.statusChips },
      { view: "table", select: pick.browserTable },
    ],
  },
  {
    id: "inspector",
    title: "Details",
    where: "aside",
    blocks: [{ view: "inspector", select: inspector }],
  },
];
