// The page, as data. App draws this list in order: to add, remove or reorder a section, edit it.
// The order follows the headline, most important first: game code (with its map by part of the
// game), game data, assets; then quality and trend; the PsyQ SDK, which is not counted, and the
// browser last.
//
// A section has an id (its anchor), a title and an optional navigation label. Its blocks are
// drawn top to bottom. Each block names a view kind (cards, meters, text, legend, domains, trend,
// filters, table, inspector), the selector that feeds it from the model and
// the route (selectors.ts, inspect.ts), and the copy around it, all from strings.ts.

import { inspector } from "./inspect.ts";
import * as pick from "./selectors.ts";
import { BROWSER, DATA, MAP, QUALITY, SDK, SUMMARY, TREND } from "./strings.ts";
import type { Section } from "./viewtypes.ts";

export const SECTIONS: Section[] = [
  {
    id: "overview",
    nav: "Overview",
    title: "Overview",
    blocks: [{ view: "cards", select: pick.overviewCards }],
  },
  {
    id: "game",
    nav: "Game code",
    title: SUMMARY.gameHeading,
    blocks: [
      { view: "cards", select: pick.gameCards, help: SUMMARY.gameHelp, note: SUMMARY.footnote },
      { view: "text", select: pick.apart },
      { view: "meters", select: pick.overviewMeter, heading: SUMMARY.statusHeading },
    ],
  },
  {
    id: "map",
    nav: "Map",
    title: MAP.heading,
    blocks: [{ view: "domains", select: pick.domains, help: MAP.help }],
  },
  {
    id: "data",
    nav: "Game data",
    title: pick.dataHeading,
    blocks: [
      { view: "cards", select: pick.dataCards, help: SUMMARY.dataHelp, note: pick.dataNote },
      { view: "meters", select: pick.dataMeters, help: DATA.help },
    ],
  },
  {
    id: "assets",
    nav: "Assets",
    title: SUMMARY.assetsHeading,
    blocks: [
      { view: "cards", select: pick.assetCards, help: SUMMARY.assetsHelp },
      { view: "meters", select: pick.assetKinds, heading: SUMMARY.assetKinds, help: SUMMARY.assetKindsHelp, when: ({ model }) => !!model.headline.assets },
    ],
  },
  {
    id: "quality",
    nav: "Quality",
    title: QUALITY.heading,
    blocks: [
      { view: "cards", select: pick.qualityCards, note: (c) => QUALITY.sentence(c.model.quality) },
      { view: "meters", select: pick.draftMeters, heading: QUALITY.perTargetHeading, help: QUALITY.perTargetHelp },
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
    id: "sdk",
    nav: "PsyQ SDK",
    title: SDK.heading,
    blocks: [{ view: "meters", select: pick.sdkLibraries, help: SDK.help, note: pick.sdkKeyLine }],
  },
  {
    id: "browse",
    nav: "Functions",
    title: BROWSER.heading,
    blocks: [
      { view: "filters", select: pick.browserFilters },
      { view: "legend", select: pick.statusChips },
      { view: "table", select: pick.browserTable, note: pick.browserScope },
    ],
  },
  {
    id: "inspector",
    title: "Details",
    where: "aside",
    blocks: [{ view: "inspector", select: inspector }],
  },
];
