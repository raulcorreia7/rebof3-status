# Site internals

How the page is built, where to change it, and the data file it reads.

`data/report.json` is the only input: the objdiff report that rebof3 `make report` writes.
`src/model/schema.ts` holds its Zod schema with only the fields the page reads; `modelFromReport`
in `src/model/report.ts` checks the file, so a changed shape fails with the file and field named,
and then builds the model the views draw (`src/types.ts`). No view reads the JSON. The model holds
the game code, the PsyQ SDK and the hand-written assembly, each from its report category.

The home page starts with a treemap, switchable between game parts and images, alongside one linked PsyQ SDK group. Its legend is above the map. It then shows game-code totals and function search, followed by the detailed parts list and SDK notes. The search finds a function by name, address or status. The parts list provides links for keyboard navigation.

## How the page is built

`src/views/App.tsx` lists the home page sections in order. Each has an `id` (its anchor, `#map`) and a title, which is also its link in the page navigation, and draws views from a **selector** in `src/selectors.ts`: a pure function that turns the model and the route into the data one view draws. The views include the treemap, `Cards`, `Meters`, `Text`, `Filters`, `Table` and `Domains`. Adding, removing or reordering a section means editing `NAV` and `Sections` in that file.

Navigation has one model. The route names a page (home, a part of the game, or an image) and, apart from it, the source file open in the side panel (`src/views/Inspector.tsx`, fed by `src/inspect.ts`), so a file opens the same way from the function list, a treemap or the panel's own links. The panel shows the unit (source file), its size, its matched functions and its address; the function list and treemap tiles are functions and open their file. Links are `Jump` (`src/views/ui.tsx`): a real `href`, and a plain click calls `go`, which pushes the route and starts a new page at the top, or scrolls to the home page section the link names. The section links show on every page.

- State lives in `src/state.ts`: a Solid store for the route (`go` copies what it stores, because the store adopts objects and changes them in place), which is kept in the URL hash (`src/model/route.ts`) so every view is a link, plus the theme and the table's row limit. Views are thin: they read the data a selector returns and the route.
- The game code map (`src/views/Domains.tsx`) is plain DOM: per part of the game a heading, a bar, then one labelled bar or tile per image. The heading opens that part's page; an image link opens the image's page.
- A part or image page (`src/views/GamePage.tsx`, selector `gamePage`) shows the report's function counts, then its game functions as a treemap and a paged list of links. The counts, the treemap and the list come from the same functions.
- `src/views/Chart.tsx` keeps one ECharts instance per chart for the life of the page. Option updates merge; a treemap replaces its data and fades the old drawing over the new one for 180 ms (`prefers-reduced-motion` turns the fade off). The chart builders state `animation: false` on the series: the treemap series otherwise defaults to a 900 ms update animation that ignores the top-level flag. ECharts fits treemap labels to their rectangles itself; a label formatter must not read the layout back, or the first paint has no labels. The page loads only the treemap and tooltip parts; bars are plain DOM (`meters`).
- Styling is Tailwind CSS v4 (`@tailwindcss/vite`), utilities in the views. `src/styles/app.css` maps the theme tokens into Tailwind's colours (`bg-card`, `text-mute`, `border-line`, ...) and holds the few shared classes (`card`, `btn`, `link`, `bar`). Status colours are custom properties set inline (`var(--st-pure)`).
- Selectors are pure functions in `src/selectors.ts` and `src/inspect.ts`; the data shapes are in `src/viewtypes.ts`.
- `src/model/`, `src/charts/` and `src/snapshot/` know nothing about the framework, and the picture and the page share them.

## Add or change things

| Task                              | Edit                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add, remove or reorder a section  | `NAV` and `Sections` in `src/views/App.tsx`. Reuse a view with a new selector in `src/selectors.ts`.                                                                                                                                                                                             |
| Add a view                        | A data shape in `src/viewtypes.ts`, a component in `src/views/`, and its use in `Sections` in `src/views/App.tsx`.                                                                                                                                                                               |
| Add a status                      | A row in `STATUS_TABLE` (`src/model/status.ts`), its label in `STATUS_LABEL` (`src/strings.ts`) and its colours in `src/theme/tokens.ts`. The key, charts, totals and picture follow.                                                                                                            |
| Add or reshape a part of the game | `GROUP_RULES` in `src/model/groups.ts` (target id pattern to group, and `tiles` for a grid of image tiles), its place in `PAGE_ORDER`, and its heading and note in `GROUP_LABEL` and `GROUP_NOTE` (`src/strings.ts`). A target no rule matches lands in `other`. Images sort by game code bytes. |
| Change wording                    | `src/strings.ts`, one name per thing: a status, a part of the game, an image and a measure keep the same words in every card, key, list and tooltip.                                                                                                                                             |
| Change the data shape             | The schema in `src/model/schema.ts` and the adapter in `src/model/report.ts`; then publish a matching `data/report.json`.                                                                                                                                                                        |

Links look like `#fn/exe%2Fslus_004_22%2Ffunc_80164028` (a source file, by its URL-encoded unit name, on the home page), `#image/emi%2Fworld00%2Farea037%2F13` (an image page; `?fn=` opens a file beside it), `#part/battle` (a part page) and `#map` (a home page section). Old `#target/...` and `#group/...` links redirect to `#image/...` and `#part/...`. The function list's query parameters are `q`, `st`, `part`, `lib`, `t`, `sort` and `dir`.

## File layout

| Path                                                     | Role                                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `data/report.json`                                       | The published objdiff report: the only data input. Vite serves it in dev and copies it into `site/`. |
| `index.html`, `vite.config.ts`                           | Page shell and bundler setup.                                                                        |
| `src/model/schema.ts`                                    | The report's Zod schema: the fields the page reads.                                                  |
| `src/types.ts`                                           | The input type (from the schema) and the model.                                                      |
| `src/model/report.ts`                                    | The adapter from report.json to the model.                                                           |
| `src/model/`                                             | Status table, parts of the game, route, browser filters, links.                                      |
| `src/selectors.ts`, `src/inspect.ts`, `src/viewtypes.ts` | The selectors and the data shapes they return.                                                       |
| `src/state.ts`                                           | Route store, hash router, theme.                                                                     |
| `src/views/`                                             | Solid views and the app shell.                                                                       |
| `src/strings.ts`                                         | All copy.                                                                                            |
| `src/charts/`                                            | The ECharts option builder for the game treemaps, shared by the page and the picture.                |
| `src/snapshot/`                                          | The picture: `progress.svg` poster with the parts of the game, the PsyQ tile map and `badge.svg`.    |
| `src/theme/`, `src/styles/app.css`                       | Colour tokens, and the Tailwind entry that maps them.                                                |
| `render/snapshot.ts`                                     | Reads `data/report.json` and writes `progress.svg`, `progress.png` and `badge.svg` into `site/`.     |
| `test/`                                                  | `node:test`: model totals from `data/report.json`.                                                   |

## Data file

`report.json` is objdiff-cli's report version 2: `version`, `categories` (`id`, `name`, `measures`) and `units`. A unit is a source file: it has a `name` (`<image>/<source stem>`), a `functions` array and `metadata` (`source_path`, `progress_categories`: `game`, `sdk` or `hand-asm`, and for SDK units `sdk`: `library`, `member` and `linkage`, one of `object`, `split-assembly` or `assembly`). The treemaps show SDK units as one "PsyQ SDK (linked)" group per executable, by library, in a neutral colour that no progress figure counts. Each function has a `name`, a `size`, an `address` offset in the file and, when measured, a `fuzzy_match_percent`.

The report has no separate target list. The adapter takes the image from the unit name: `exe/<name>` for the main executables and `emi/<family>/<archive>/<slot>` for the overlays. The rest of the unit name is the source stem inside that image, and its functions are the counted entries. Images with no units do not appear.

The adapter maps a function to a status from its fuzzy match:

| Function                                         | Status                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| game, fuzzy 100                                  | `pure` (rebuilt in C)                                                                           |
| game, fuzzy above 0 but below 100                | `nonmatching` (draft in C)                                                                      |
| game, no fuzzy match                             | `open` (not started: original assembly, also a C file that only includes it with `INCLUDE_ASM`) |
| sdk, `linkage` is `object`                       | `object` (linked from a PsyQ object)                                                            |
| sdk, `linkage` is `split-assembly` or `assembly` | `assembly` (SDK, split assembly; matched when its fuzzy match is 100)                           |
| hand-asm, fuzzy 100                              | `asm`                                                                                           |
| hand-asm, otherwise                              | `assembly`                                                                                      |

A function is matched only when its `fuzzy_match_percent` is 100; a complete unit can still hold a function below 100. The adapter counts functions, matched functions and both byte totals from `units[].functions`, so the headline, images, parts and treemap agree with the category measures (`total_functions`, `matched_functions`, `total_code`, `matched_code`). The unit stays the file level: the inspector opens it, and its Functions field counts how many of its functions match.

Publishing: [README](../README.md#publish).
