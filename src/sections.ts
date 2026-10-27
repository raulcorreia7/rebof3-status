// The page, as data. App draws this list in order: to add, remove or reorder a section, edit it.
// Three sections: the overview of the game code, the map of its parts (an image opens its
// functions), and the SDK line. The search box finds a function from anywhere.
//
// A section has an id (its anchor, #map), a title (also its link in the page navigation) and
// blocks drawn top to bottom. Each block names a view kind (cards, meters, text, domains, filters,
// table, inspector), the selector that feeds it from the model and the route (selectors.ts,
// inspect.ts), and the copy around it, all from strings.ts.

import { inspector } from "./inspect.ts";
import * as pick from "./selectors.ts";
import { BROWSER, MAP, SDK, SUMMARY } from "./strings.ts";
import type { Section } from "./viewtypes.ts";

export const SECTIONS: Section[] = [
  {
    id: "overview",
    title: SUMMARY.overviewHeading,
    blocks: [
      { view: "cards", select: pick.overviewCards },
      { view: "meters", select: pick.overviewMeter },
    ],
  },
  {
    id: "find",
    title: BROWSER.heading,
    blocks: [
      { view: "filters", select: pick.search },
      { view: "table", select: pick.searchTable, when: ({ route }) => !!route.q },
    ],
  },
  {
    id: "map",
    title: MAP.heading,
    blocks: [{ view: "domains", select: pick.domains, help: MAP.help }],
  },
  {
    id: "sdk",
    title: SDK.heading,
    blocks: [{ view: "text", select: pick.apart }],
  },
  {
    id: "inspector",
    title: "",
    where: "aside",
    blocks: [{ view: "inspector", select: inspector }],
  },
];
