# Site internals

How the page is built, where to change it, and the data files it reads.

`src/model/schema.ts` holds a Zod schema per data file with only the fields the page reads;
`modelFromFiles` in `src/model/report.ts` checks each file against it, so a changed shape fails
with the file and field named, and then builds the model the views draw (`src/types.ts`). No view
reads the JSON. The headline (`model.headline`) has three parts: game code from `status.json` (the
report when that file is missing), game data from `status-data.json`, and assets from
`assets.json`. The map and its parts of the game count the same units as the headline: each
target's game functions from `status.json` (`target.code`, summed into `group.code` and
`model.code`). The function list holds the report's units, which can be fewer, and the report adds
the fuzzy match. The SDK and the hand-written assembly are shown apart.

## How the page is built

The page is data. `src/sections.ts` is an ordered list of sections; each has an `id`, a title, an optional navigation label and a list of blocks. A block names a **view kind** (`cards`, `meters`, `text`, `legend`, `tabs`, `domains`, `treemap`, `chart`, `trend`, `filters`, `table`, `inspector`) and a **selector** that turns the model and the route into the data that view draws. `src/views/App.tsx` draws the list in order, so adding, removing or reordering a section means editing that list.

- State lives in `src/state.ts`: a Solid store for the route, which is kept in the URL hash (`src/model/route.ts`) so every view is a link, plus the theme and the table's row limit. Views are thin: they read the data a selector returns and the route.
- The game code map (`src/views/Domains.tsx`) is plain DOM: per part of the game a heading, a bar, then one labelled bar or tile per image. The heading opens that part's treemap; an image link opens its function treemap.
- `src/views/Chart.tsx` keeps one ECharts instance per chart for the life of the page. Option updates merge; the PsyQ treemap replaces its focused data and fades the old drawing over the new one for 180 ms (`prefers-reduced-motion` turns the fade off). The chart builders state `animation: false` on the series: the treemap series otherwise defaults to a 900 ms update animation that ignores the top-level flag. ECharts fits treemap labels to their rectangles itself; a label formatter must not read the layout back, or the first paint has no labels. Game treemaps use a canvas for functions and a paged DOM list of the same report rows.
- `#part/...` and `#image/...` routes use `status.json` for scope totals and `report.json` for per-function rows, sizes, C statuses and fuzzy matches when present. `status.json` has no per-function rows; `report.json` can omit functions counted by the status census, and each scope displays the row and byte differences.
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
| Change wording | `src/strings.ts`. Section titles and navigation labels are in `src/sections.ts`. |
| Change the data shape | The schema in `src/model/schema.ts` and the adapter in `src/model/report.ts`; update the fixtures. |

Links look like `#fn/exe%2Fslus_004_22%2Ffunc_80164028` (the unit name, URL-encoded), `#target/emi%2Fbattle%2Fbattle%2F03`, `#image/emi%2Fworld00%2Farea037%2F13` (an image treemap) and `#part/battle` (a part treemap). Older `#group/battle` links redirect to `#part/battle`. Query parameters include `q`, `st`, `part`, `lib`, `t`, `g`, `sort`, `dir` and `map`.

## File layout

| Path | Role |
| --- | --- |
| `test/fixtures/report.json` | The sample report: a trimmed objdiff report v2 (numbers only). |
| `test/fixtures/status-data.json` | The sample data census from `bin/status --data`. |
| `test/fixtures/history.json` | The committed history rows and the report's commit and date. |
| `test/fixtures/status.json`, `test/fixtures/assets.json` | The sample game code and asset censuses. |
| `index.html`, `vite.config.ts` | Page shell and bundler setup. |
| `src/model/schema.ts` | The data files' Zod schemas: the fields the page reads. |
| `src/types.ts` | The input types (from the schemas) and the model. |
| `src/model/report.ts` | The adapter from the data files to the model. |
| `src/model/` | Status table, parts of the game, history by day, route, browser filters, links. |
| `src/sections.ts`, `src/selectors.ts`, `src/inspect.ts`, `src/viewtypes.ts` | The section registry, its selectors and data shapes. |
| `src/state.ts` | Route store, hash router, theme. |
| `src/views/` | Solid views, one per view kind, and the app shell. |
| `src/strings.ts` | All copy. |
| `src/charts/` | ECharts option builders (PsyQ treemap, trend, bars), shared by the page and the picture. |
| `src/snapshot/` | The picture: `progress.svg` poster with the parts of the game, the PsyQ tile map and `badge.svg`. |
| `src/theme/`, `src/styles/app.css` | Colour tokens, and the Tailwind entry that maps them. |
| `render/snapshot.ts` | Copies the data files and writes `progress.svg`, `progress.png` and `badge.svg` into `site/`. |
| `test/` | `node:test`: model totals, and the files the build wrote into `site/`. |

## Data files

`report.json` is objdiff-cli's report version 2: `version`, top-level `measures`, `categories` (`id`, `name`, `measures`) and `units`. A unit has a `name` (`<target>/<stem>`), `measures` (`total_code`, `matched_code`, `matched_functions`, `fuzzy_match_percent`) and `metadata`: `complete`, `source_path` and `progress_categories` (`game`, `sdk` or `hand-asm`). The committed sample omits the per-section and per-function records the page does not read.

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

`status.json` is `bin/status --json`; the page reads `game_code` (`functions`, `exact`, `bytes`, `exact_bytes` and the same four as `unique_*`, each repeated function body once) and, per target, `non_matching` and `game` (`exact`, `total`, `exact_bytes`, `bytes`). A target's drafts are its `non_matching` units, capped at its game functions that are not exact; `bin/status` publishes no draft bytes, so the map gives drafts as a count. Without `targets` (an older publish) the map counts the report's units. `assets.json` has `kinds` (`kind`, `entries`, `bytes`, `handling`: `decoded`, `raw` or `none`, `round_trip_bytes`) and their `totals`. Both are optional: an older `gh-pages` branch lacks them and the page shows "from next run".

`status-data.json` has `targets` (`target`, `payload`, `code`, `data_payload`, `typed`, `percent`) and the same fields under `totals`, plus `raw_c` (bytes in C as byte arrays named by address, not typed) and the bytes left out of `data_payload` (`reserved`, `copied`, `sdk`, `asset`). The adapter caps each target's `typed` at its `data_payload`, so a share never passes 100%: the object census counts every compiled object, and a draft can emit a compiler table larger than the reviewed map placement (START.EMI slot 8: 9,998 raw bytes against a 9,978-byte data payload, a 20-byte jump table in `func_801DEEE8.o` where the map has a 24-byte rodata placement). `history.json` has `commit`, `generated_at` and `rows`, each row holding `date`, `revision`, `source` and the headline numbers; the adapter appends the headline as a row (over that day's published row) so the last point of every chart matches it. A row without `game_unique` is from the older publisher: it took game code from the report and counted byte arrays named by address as typed data.
