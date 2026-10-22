# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)

[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Status of the Breath of Fire III decompilation: matched game code, the PsyQ SDK, typed data, code quality and the daily trend. Everything here is generated from the decompilation; do not edit `progress.json` by hand. Live page: <https://raulcorreia7.github.io/rebof3-status/>.

This repository holds only status data and its renderer. It has no source code, assembly, headers or game data.

## Where things live

The decompilation measures itself: `bin/progress` in rebof3 writes `progress.json`, because only rebof3 can read its Splat maps, link its targets and count its functions. This repository holds the page, the picture renderer and the published data, and no measuring code, so the page can change without touching the decompilation. The monorepo holds both as submodules, so its `scripts/publish-progress` is the one command that measures, copies `progress.json` here and commits it locally (the owner pushes); rebof3's post-merge hook runs it after each merge into `main`. The same command builds `site/` here and force-pushes it, as one commit, to `gh-pages`, which Pages serves without building anything.

## Stack

TypeScript with SolidJS for the page, Vite (with `vite-plugin-solid`) to bundle it into `site/`, ECharts (tree-shaken) for the treemap and the charts, and resvg for `progress.png`. Node 22.18+ runs the `.ts` model, the picture script and the tests directly (type stripping). All dependencies are pinned in `package.json`.

## Run

```sh
npm ci
npm run dev      # Vite dev server with hot reload; serves progress.json from the repo root
npm run build    # vite build into site/, then render/snapshot.ts writes progress.json, progress.svg, progress.png and badge.svg
npm test         # model totals and the files in site/ (build first; `make test` does both)
npx tsc -p .     # type check
```

The picture needs the DejaVu Sans font (`fonts-dejavu-core`).

`verify.yml` checks the sources on each push to `main` that changes code; a push that only
rewrites `progress.json` does not trigger it. `deploy.yml` only publishes `gh-pages`, so a
publish is one static upload and no build.

## How the page is built

The page is data. `src/sections.ts` is an ordered list of sections; each has an `id`, a title, an optional navigation label and a list of blocks. A block names a **view kind** (`cards`, `meters`, `text`, `legend`, `tabs`, `treemap`, `strips`, `chart`, `trend`, `filters`, `table`, `inspector`) and a **selector** that turns the model and the route into the data that view draws. `src/views/App.tsx` draws the list in order, so adding, removing or reordering a section means editing that list.

- State lives in `src/state.ts`: a Solid store for the route, which is kept in the URL hash (`src/model/route.ts`) so every view is a link, plus the theme and the table's row limit. Views are thin: they read the data a selector returns and the route.
- Selectors are pure functions in `src/selectors.ts` and `src/inspect.ts`; the data shapes are in `src/viewtypes.ts`.
- `src/model/`, `src/charts/` and `src/snapshot/` know nothing about the framework, and the picture and the page share them.

### Add or change things

| Task | Edit |
| --- | --- |
| Add, remove or reorder a section or block | `src/sections.ts`. Reuse a view kind with a new selector in `src/selectors.ts`. |
| Add a view kind | A data shape in `src/viewtypes.ts`, a component in `src/views/`, and its entry in `VIEWS` in `src/views/App.tsx`. |
| Add a status | A row in `STATUS_TABLE` (`src/model/status.ts`: key, phase class, where it counts as done, whether it has a C file), its label in `STATUS_LABEL` (`src/strings.ts`) and its colours in `src/theme/tokens.ts`. The legend, filters, charts, totals and picture follow. |
| Add or reshape a group | `GROUP_RULES` and `GROUP_ORDER` in `src/model/groups.ts` (target id pattern to group), and its heading and note in `src/strings.ts`. |
| Change wording | `src/strings.ts`. Section titles and navigation labels are in `src/sections.ts`. |
| Change colours or layout | `src/theme/tokens.ts`, `src/styles/`. |

Links look like `#fn/exe/0x8015AD00`, `#target/game00`, `#group/emi/battle`, with `q`, `st`, `part`, `lib`, `t`, `g`, `sort`, `dir`, `map` and `reserved` as query parameters.

## File layout

| Path | Role |
| --- | --- |
| `progress.json` | The data. `scripts/publish-progress` copies it here. Schema 2 is described below. |
| `index.html`, `vite.config.ts` | Page shell and bundler setup. |
| `src/sections.ts`, `src/selectors.ts`, `src/inspect.ts`, `src/viewtypes.ts` | The section registry, its selectors and data shapes. |
| `src/state.ts` | Route store, hash router, theme. |
| `src/views/` | Solid views, one per view kind, and the app shell. |
| `src/types.ts`, `src/strings.ts` | The schema types and all copy. |
| `src/model/` | Pure data model, no DOM: totals, status table, group rules, history by day, route, browser filters, address strips. |
| `src/charts/` | ECharts option builders (treemap, trend, bars), shared by the page and the picture. |
| `src/snapshot/` | The picture: `progress.svg` poster, tile map and `badge.svg`. |
| `src/theme/`, `src/styles/` | Color tokens and CSS. |
| `render/snapshot.ts` | Writes `progress.json`, `progress.svg`, `progress.png` and `badge.svg` into `site/`. |
| `test/` | `node:test`: model totals, and the files the build wrote into `site/`. |
| `.github/workflows/verify.yml` | On each push to `main` that changes code: type-check, build and test. It does not deploy. |
| `.github/workflows/deploy.yml` | On each push to `gh-pages`: upload the built files and deploy GitHub Pages. |

The map has three views: tiles (one square per function, coloured by status), PsyQ SDK tiles, and address-true strips. The treemap drills target, then overlay or area, then function; the legend filters by status. Block area is code bytes, with an 64-byte floor per function so a stub stays visible. The page derives the game function records from the schema-2 `units` rows (`kind` `f`), so it needs no second data file.

## `progress.json` schema 2

- `schema`, `generated_at`, `commit` (the decompilation commit), `dirty`.
- `summary.code`, `summary.game`, `summary.sdk`: `functions`, `bytes`, `done_functions`, `done_bytes`, `statuses` (`status: [functions, bytes]`). `code` covers every function, `game` and `sdk` split it.
- `summary.data`: `bytes` outside code and `typed` in C. `summary.quality`: `fakes`, `harmful_fakes`, `benign_fakes`, `field_ref`, `local_externs`, `sym_conflicts`, `hand_asm`.
- `summary.links`: targets by image link verdict. `summary.layout`: the audit of the units against the Splat maps (`rows`, `gaps`, `overlaps`, `relocated`, `unmodelled`, `resized`, `problems`).
- `targets[]`: `id`, `name`, `base` and `end` (the retail load range), `counts` (as `bin/status`), `link` (`status` `EXACT`, `DIFFERS` or `ERROR`, `payload`, `linked`, `first_mismatch` as a payload offset), `layout` (audit), `data`, and `units`: one `[offset, size, kind, status, name]` per Splat map row in address order. A row sits at `base + offset`. `kind` is `f` (game function), `s` (PsyQ function) or `d` (data or raw bytes).
- `libraries[]`: `name`, `versions` (PsyQ version to exact objects), `tiers` and `functions` (`target`, `addr`, `name`, `bytes`, `status`, `tier`, `version`, `score`), best match first. `tier` is `c`, `object`, `partial`, `assembly` or `unmatched`.
- `history[]`: one row per day with the numerator and denominator of each headline.

Function statuses: `pure` (matched C), `match_with_helpers` (matched with helper macros), `asm` (original assembly, exact), `object` (library object), `assembly` (library assembly), `nonmatching` (C in progress), `open` (assembly). Other map rows are `typed` (compiled from C), `raw` or `header`.
