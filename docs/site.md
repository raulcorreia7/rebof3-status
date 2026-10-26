# Site internals

How the page is built, where to change it, and the data file it reads.

`data/report.json` is the only input: the objdiff report that rebof3 `make report` writes.
`src/model/schema.ts` holds its Zod schema with only the fields the page reads; `modelFromReport`
in `src/model/report.ts` checks the file, so a changed shape fails with the file and field named,
and then builds the model the views draw (`src/types.ts`). No view reads the JSON. The model holds
the game code, the PsyQ SDK and the hand-written assembly, each from its report category.

The report does not carry the game-data census, disc assets, a per-day history or unique-function
counts, so those views are gone: the **Game data** and **Assets** sections, the **Progress over
time** charts and the **Unique game functions** card. The page keeps the report-backed views: the
overview and game cards, the map of parts and images, match quality, the PsyQ SDK and the function
browser.

## How the page is built

The page is data. `src/sections.ts` is an ordered list of sections; each has an `id` (its anchor, `#map`), a title (also its link in the page navigation) and a list of blocks. A block names a **view kind** (`cards`, `meters`, `text`, `legend`, `domains`, `filters`, `table`, `inspector`) and a **selector** that turns the model and the route into the data that view draws. `src/views/App.tsx` draws the list in order, so adding, removing or reordering a section means editing that list. Each number has one home: the overview cards are not repeated in the sections below them.

Navigation has one model. The route names a page (home, a part of the game, or an image) and, apart from it, the function open in the side panel (`src/views/Inspector.tsx`, fed by `src/inspect.ts`), so a function opens the same way from the function list, a treemap or the panel's own links. Links are `Jump` (`src/views/ui.tsx`): a real `href`, and a plain click calls `go`, which pushes the route and starts a new page at the top, or scrolls to the home page section the link names. The section links show on every page.

- State lives in `src/state.ts`: a Solid store for the route (`go` copies what it stores, because the store adopts objects and changes them in place), which is kept in the URL hash (`src/model/route.ts`) so every view is a link, plus the theme and the table's row limit. Views are thin: they read the data a selector returns and the route.
- The game code map (`src/views/Domains.tsx`) is plain DOM: per part of the game a heading, a bar, then one labelled bar or tile per image. The heading opens that part's page; an image link opens the image's page.
- A part or image page (`src/views/GamePage.tsx`, selector `gamePage`) shows the report's counts, then its game functions as a treemap and a paged list of links. The counts and the treemap come from the same units.
- `src/views/Chart.tsx` keeps one ECharts instance per chart for the life of the page. Option updates merge; a treemap replaces its data and fades the old drawing over the new one for 180 ms (`prefers-reduced-motion` turns the fade off). The chart builders state `animation: false` on the series: the treemap series otherwise defaults to a 900 ms update animation that ignores the top-level flag. ECharts fits treemap labels to their rectangles itself; a label formatter must not read the layout back, or the first paint has no labels. The page loads only the treemap and tooltip parts; bars are plain DOM (`meters`).
- Styling is Tailwind CSS v4 (`@tailwindcss/vite`), utilities in the views. `src/styles/app.css` maps the theme tokens into Tailwind's colours (`bg-card`, `text-mute`, `border-line`, ...) and holds the few shared classes (`card`, `btn`, `link`, `bar`). Status colours are custom properties set inline (`var(--st-pure)`).
- Selectors are pure functions in `src/selectors.ts` and `src/inspect.ts`; the data shapes are in `src/viewtypes.ts`.
- `src/model/`, `src/charts/` and `src/snapshot/` know nothing about the framework, and the picture and the page share them.

## Add or change things

| Task | Edit |
| --- | --- |
| Add, remove or reorder a section or block | `src/sections.ts`. Reuse a view kind with a new selector in `src/selectors.ts`. |
| Add a view kind | A data shape in `src/viewtypes.ts`, a component in `src/views/`, and its entry in `VIEWS` in `src/views/App.tsx`. |
| Add a status | A row in `STATUS_TABLE` (`src/model/status.ts`), its label in `STATUS_LABEL` (`src/strings.ts`) and its colours in `src/theme/tokens.ts`. The legend, filters, charts, totals and picture follow. |
| Add or reshape a part of the game | `GROUP_RULES` in `src/model/groups.ts` (target id pattern to group, and `tiles` for a grid of image tiles), its place in `PAGE_ORDER`, and its heading and note in `GROUP_LABEL` and `GROUP_NOTE` (`src/strings.ts`). A target no rule matches lands in `other`. Images sort by game code bytes. |
| Change wording | `src/strings.ts`, one name per thing: a status, a part of the game, an image and a measure keep the same words in every card, key, list and tooltip. |
| Change the data shape | The schema in `src/model/schema.ts` and the adapter in `src/model/report.ts`; then publish a matching `data/report.json`. |

Links look like `#fn/exe%2Fslus_004_22%2Ffunc_80164028` (a function, by its URL-encoded unit name, on the home page), `#image/emi%2Fworld00%2Farea037%2F13` (an image page; `?fn=` opens a function beside it), `#part/battle` (a part page) and `#map` (a home page section). Older `#target/...` and `#group/...` links redirect to `#image/...` and `#part/...`. The function list's query parameters are `q`, `st`, `part`, `lib`, `t`, `sort` and `dir`.

## File layout

| Path | Role |
| --- | --- |
| `data/report.json` | The published objdiff report: the only data input. Vite serves it in dev and copies it into `site/`. |
| `index.html`, `vite.config.ts` | Page shell and bundler setup. |
| `src/model/schema.ts` | The report's Zod schema: the fields the page reads. |
| `src/types.ts` | The input type (from the schema) and the model. |
| `src/model/report.ts` | The adapter from report.json to the model. |
| `src/model/` | Status table, parts of the game, route, browser filters, links. |
| `src/sections.ts`, `src/selectors.ts`, `src/inspect.ts`, `src/viewtypes.ts` | The section registry, its selectors and data shapes. |
| `src/state.ts` | Route store, hash router, theme. |
| `src/views/` | Solid views, one per view kind, and the app shell. |
| `src/strings.ts` | All copy. |
| `src/charts/` | The ECharts option builder for the game treemaps, shared by the page and the picture. |
| `src/snapshot/` | The picture: `progress.svg` poster with the parts of the game, the PsyQ tile map and `badge.svg`. |
| `src/theme/`, `src/styles/app.css` | Colour tokens, and the Tailwind entry that maps them. |
| `render/snapshot.ts` | Reads `data/report.json` and writes `progress.svg`, `progress.png` and `badge.svg` into `site/`. |
| `test/` | `node:test`: model totals from `data/report.json`. |

## Data file

`report.json` is objdiff-cli's report version 2: `version`, `categories` (`id`, `name`, `measures`) and `units`. A unit has a `name` (`<image>/<source stem>`), `measures` (`total_code`, `matched_code`, `fuzzy_match_percent`) and `metadata`: `complete`, `source_path` and `progress_categories` (`game`, `sdk` or `hand-asm`).

The report has no separate target list. The adapter takes the image from the unit name: `exe/<name>` for the main executables and `emi/<family>/<archive>/<slot>` for the overlays. The rest of the name is the function's name inside that image. Images with no units do not appear.

The adapter maps a unit to a status from that metadata:

| Unit | Status |
| --- | --- |
| game, `complete` | `pure` (rebuilt in C) |
| game, has `source_path` and a fuzzy match above 0 | `nonmatching` (draft in C) |
| game, otherwise | `open` (not started: original assembly, also a C file that only includes it with `INCLUDE_ASM`) |
| sdk, has a `toolchains/psyq/<version>/<library>/<object>` source | `object` |
| sdk, no source | `assembly` |
| hand-asm, `complete` | `asm` |
| hand-asm, not complete | `assembly` |

The three category measures give the byte-weighted fuzzy match for the game, the SDK and the hand-written assembly; the adapter counts functions and bytes from the units themselves. `target.code` and `group.code` count the game units the report lists, and sum to the headline. The PsyQ SDK and the hand-written assembly stay apart and never enter the game totals.

Publishing: [README](../README.md#publish).
