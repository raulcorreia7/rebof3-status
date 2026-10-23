# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)

[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Status of the Breath of Fire III decompilation: game code matched by bytes, fuzzy match, functions, the PsyQ SDK, typed data, match quality and the daily trend. Everything here is generated from the decompilation; do not edit the data files by hand. The site is not published yet.

This repository holds only status data and its renderer. It has no source code, assembly, headers or game data.

## Data

`rebof3` measures itself with `make report`: objdiff builds one unit per compiled C source and reports each category's bytes and fuzzy match. The site reads three files:

| File                | Writer                          | Content                                                                                                                               |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `report.json`       | `objdiff-cli report generate`   | Units and categories (`game`, `sdk`, `hand-asm`), each with matched bytes, matched functions and fuzzy match.                          |
| `status-data.json`  | `rebof3/bin/status --data`      | The typed and named data census: payload, code, data and typed bytes per target, plus their totals.                                   |
| `history.json`      | the site                        | One row per day with the headline numbers, plus the rebof3 commit and date the current report was measured at.                        |

`src/model/report.ts` is the one adapter from those files to the model the views draw (`src/types.ts`); no view reads the JSON shapes. The game category is the only set the headline counts; the SDK and the hand-written assembly are shown apart.

The committed files under `test/fixtures` are a trimmed copy of a real report: the numbers and the unit names, without the per-section and per-function records. The build and the tests therefore run without the decompilation checkout. To render a fresh report, point the renderer at its directory:

```sh
node render/snapshot.ts site /path/to/report-dir
```

## Run

```sh
npm ci
npm run dev      # Vite dev server with hot reload; reads the data from test/fixtures
npm run build    # vite build into site/, then render/snapshot.ts writes the data and the pictures
npm test         # model totals and the files in site/ (build first; `make test` does both)
npx tsc -p .     # type check
```

`npm run dev` reads the fixtures directly; `npm run build` copies them into `site/` and renders the pictures.

The picture needs the DejaVu Sans font (`fonts-dejavu-core`).

`verify.yml` checks the sources on each push to `main` that changes code; `deploy.yml` only publishes `gh-pages`, so a publish is one static upload and no build.

## How the page is built

The page is data. `src/sections.ts` is an ordered list of sections; each has an `id`, a title, an optional navigation label and a list of blocks. A block names a **view kind** (`cards`, `meters`, `text`, `legend`, `tabs`, `treemap`, `chart`, `trend`, `filters`, `table`, `inspector`) and a **selector** that turns the model and the route into the data that view draws. `src/views/App.tsx` draws the list in order, so adding, removing or reordering a section means editing that list.

- State lives in `src/state.ts`: a Solid store for the route, which is kept in the URL hash (`src/model/route.ts`) so every view is a link, plus the theme and the table's row limit. Views are thin: they read the data a selector returns and the route.
- Selectors are pure functions in `src/selectors.ts` and `src/inspect.ts`; the data shapes are in `src/viewtypes.ts`.
- `src/model/`, `src/charts/` and `src/snapshot/` know nothing about the framework, and the picture and the page share them.

### Add or change things

| Task | Edit |
| --- | --- |
| Add, remove or reorder a section or block | `src/sections.ts`. Reuse a view kind with a new selector in `src/selectors.ts`. |
| Add a view kind | A data shape in `src/viewtypes.ts`, a component in `src/views/`, and its entry in `VIEWS` in `src/views/App.tsx`. |
| Add a status | A row in `STATUS_TABLE` (`src/model/status.ts`), its label in `STATUS_LABEL` (`src/strings.ts`) and its colours in `src/theme/tokens.ts`. The legend, filters, charts, totals and picture follow. |
| Add or reshape a group | `GROUP_RULES` and `GROUP_ORDER` in `src/model/groups.ts` (target id pattern to group), and its heading and note in `src/strings.ts`. |
| Change wording | `src/strings.ts`. Section titles and navigation labels are in `src/sections.ts`. |
| Change the data shape | `src/types.ts` and the adapter in `src/model/report.ts`; update the fixtures. |

Links look like `#fn/exe%2Fslus_004_22%2Ffunc_80164028` (the unit name, URL-encoded), `#target/emi%2Fbattle%2Fbattle%2F03`, `#group/emi%2Fbattle`, with `q`, `st`, `part`, `lib`, `t`, `g`, `sort`, `dir` and `map` as query parameters.

## File layout

| Path | Role |
| --- | --- |
| `test/fixtures/report.json` | The sample report: a trimmed objdiff report v2 (numbers only). |
| `test/fixtures/status-data.json` | The sample data census from `bin/status --data`. |
| `test/fixtures/history.json` | The committed history rows and the report's commit and date. |
| `index.html`, `vite.config.ts` | Page shell and bundler setup. |
| `src/types.ts` | The JSON shapes and the model. |
| `src/model/report.ts` | The adapter from the data files to the model. |
| `src/model/` | Status table, group rules, history by day, route, browser filters, links. |
| `src/sections.ts`, `src/selectors.ts`, `src/inspect.ts`, `src/viewtypes.ts` | The section registry, its selectors and data shapes. |
| `src/state.ts` | Route store, hash router, theme. |
| `src/views/` | Solid views, one per view kind, and the app shell. |
| `src/strings.ts` | All copy. |
| `src/charts/` | ECharts option builders (treemap, trend, bars), shared by the page and the picture. |
| `src/snapshot/` | The picture: `progress.svg` poster, tile map and `badge.svg`. |
| `src/theme/`, `src/styles/` | Color tokens and CSS. |
| `render/snapshot.ts` | Copies the data files and writes `progress.svg`, `progress.png` and `badge.svg` into `site/`. |
| `test/` | `node:test`: model totals, and the files the build wrote into `site/`. |

## Data files

`report.json` is objdiff-cli's report version 2: `version`, top-level `measures`, `categories` (`id`, `name`, `measures`) and `units`. A unit has a `name` (`<target>/<stem>`), `measures` (`total_code`, `matched_code`, `matched_functions`, `fuzzy_match_percent`) and `metadata`: `complete`, `source_path` and `progress_categories` (`game`, `sdk` or `hand-asm`). The committed sample omits the per-section and per-function records the page does not read.

The adapter maps a unit to a status from that metadata:

| Unit | Status |
| --- | --- |
| game, `complete` | `pure` (rebuilt in C) |
| game, has `source_path` | `nonmatching` (being rebuilt) |
| game, no `source_path` | `open` (still the original assembly) |
| sdk, has a `toolchains/psyq/<version>/<library>/<object>` source | `object` |
| sdk, no source | `assembly` |
| hand-asm, `complete` | `asm` |
| hand-asm, not complete | `assembly` |

`status-data.json` has `targets` (`target`, `payload`, `code`, `data_payload`, `typed`, `percent`) and the same fields under `totals`. The adapter caps each target's `typed` at its `data_payload`, so a share never passes 100%: the object census counts every compiled object, and a draft can emit a compiler table larger than the reviewed map placement (START.EMI slot 8: 9,998 raw bytes against a 9,978-byte data payload, a 20-byte jump table in `func_801DEEE8.o` where the map has a 24-byte rodata placement). `history.json` has `commit`, `generated_at` and `rows`, each row holding `date`, `revision`, `source` and the headline numbers; the adapter appends the current report as a row so the last point of every chart matches the headline.
