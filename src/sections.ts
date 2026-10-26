// The page, as data. App draws this list in order: to add, remove or reorder a section, edit it.
// The order follows the headline, most important first: game code and its parts of the game; then
// match quality and progress; the PsyQ SDK, which is not counted; the function list last. Each
// number has one home: the overview cards are not repeated below.
//
// A section has an id (its anchor, #map), a title (also its link in the page navigation) and
// blocks drawn top to bottom. Each block names a view kind (cards, meters, text, legend, domains,
// filters, table, inspector), the selector that feeds it from the model and the route
// (selectors.ts, inspect.ts), and the copy around it, all from strings.ts.

import { inspector } from "./inspect.ts";
import * as pick from "./selectors.ts";
import { BROWSER, MAP, QUALITY, SDK, SUMMARY } from "./strings.ts";
import type { Section } from "./viewtypes.ts";

export const SECTIONS: Section[] = [
  {
    id: "overview",
    title: SUMMARY.overviewHeading,
    blocks: [{ view: "cards", select: pick.overviewCards }],
  },
  {
    id: "game",
    title: SUMMARY.gameHeading,
    blocks: [{ view: "cards", select: pick.gameCards, help: SUMMARY.gameHelp }],
  },
  {
    id: "map",
    title: MAP.heading,
    blocks: [{ view: "domains", select: pick.domains, help: MAP.help }],
  },
  {
    id: "quality",
    title: QUALITY.heading,
    blocks: [
      { view: "meters", select: pick.draftMeters, heading: QUALITY.perTargetHeading, help: QUALITY.perTargetHelp },
      { view: "text", select: pick.verification, heading: QUALITY.verifyHeading },
      { view: "table", select: pick.auditTable },
    ],
  },
  {
    id: "sdk",
    title: SDK.heading,
    blocks: [
      { view: "text", select: pick.apart },
      { view: "meters", select: pick.sdkLibraries, heading: SDK.librariesHeading, help: SDK.help },
    ],
  },
  {
    id: "browse",
    title: BROWSER.heading,
    blocks: [
      { view: "filters", select: pick.browserFilters },
      { view: "legend", select: pick.statusChips },
      { view: "table", select: pick.browserTable },
    ],
  },
  {
    id: "inspector",
    title: "",
    where: "aside",
    blocks: [{ view: "inspector", select: inspector }],
  },
];
