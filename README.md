# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)

[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Status of the Breath of Fire III decompilation: matched game code, the PsyQ SDK, typed data, code quality and the daily trend. Everything here is generated from the decompilation; do not edit `progress.json` by hand. Live page: <https://raulcorreia7.github.io/rebof3-status/>.

This repository holds only status data and its renderer. It has no source code, assembly, headers or game data.

## Where things live

The decompilation measures itself: `bin/progress` in rebof3 writes `progress.json`, because only rebof3 can read its Splat maps, link its targets and count its functions. This repository holds the page, the picture renderer and the published data, and no measuring code, so the page can change without touching the decompilation. The monorepo holds both as submodules, so its `scripts/publish-progress` is the one command that measures, copies `progress.json` here, commits and pushes; rebof3's post-merge hook runs it after each merge into `main`. The workflow here then draws the page and the picture from `progress.json`.

## Stack

TypeScript with Preact (3 kB) for the page, ECharts (tree-shaken) for the treemap and trend charts, esbuild to bundle, and resvg for `progress.png`. Preact keeps the page declarative with almost no runtime. ECharts supplies the zoomable treemap and the axes. Node 22.18+ runs the `.ts` model, tests and build script directly (type stripping), so there is no compile step apart from the page bundle. All dependencies are pinned in `package.json`.

## Run

```sh
npm ci
npm run dev      # builds into site/ and rebuilds on change
python3 -m http.server -d site
npm run build    # same as: node render/build.mjs site
npm test         # model, strips, picture smoke, and a headless Chromium page check
npx tsc -p .     # type check
```

The Chromium test skips itself when no `chromium` or `google-chrome` is on `PATH`. The picture needs the DejaVu Sans font (`fonts-dejavu-core`).

## Change the page

Every sentence, label and number format lives in `src/strings.ts`; edit the wording there and nowhere else. Colors live in `src/theme/tokens.ts` (dark and light, status and match-tier colors), layout in `src/styles/`. The page state lives in the URL hash (`src/model/route.ts`), so every view is a link: `#fn/exe/0x8015AD00`, `#target/game00`, `#group/emi/battle`, with `q`, `st`, `part`, `lib`, `t`, `g`, `sort`, `dir`, `map` and `reserved` as query parameters.

## File layout

| Path | Role |
| --- | --- |
| `progress.json` | The data. `scripts/publish-progress` copies it here. Schema 2 is described below. |
| `index.html` | Page shell: title, description, `noscript` text. |
| `src/types.ts`, `src/strings.ts` | The schema types and all copy. |
| `src/model/` | Pure data model, no DOM: totals, groups, history by day, route, browser filters, address strips. Unit tested. |
| `src/charts/` | ECharts option builders (treemap, trend, bars), shared by the page and the picture. |
| `src/components/` | Preact components, one per section (summary, groups, map, SDK, data, quality, trend, browser, inspector). |
| `src/theme/`, `src/styles/` | Color tokens and CSS. |
| `src/snapshot/` | The picture: `progress.svg` poster, tile map and `badge.svg`. |
| `render/build.mjs`, `render/build.ts` | `node render/build.mjs site` bundles the page and writes `progress.svg`, `progress.png` and `badge.svg`. |
| `test/` | `node:test` suites. |
| `.github/workflows/pages.yml` | On each push to `main`, tests, builds and deploys GitHub Pages. |

The map has three views: tiles (one square per function, coloured by status), PsyQ SDK tiles, and address-true strips. The treemap drills target, then overlay or area, then function; the legend filters by status. Block area is code bytes, with an 80-byte floor per function so a stub stays visible. The page derives the game function records from the schema-2 `units` rows (`kind` `f`), so it needs no second data file.

## `progress.json` schema 2

- `schema`, `generated_at`, `commit` (the decompilation commit), `dirty`.
- `summary.code`, `summary.game`, `summary.sdk`: `functions`, `bytes`, `done_functions`, `done_bytes`, `statuses` (`status: [functions, bytes]`). `code` covers every function, `game` and `sdk` split it.
- `summary.data`: `bytes` outside code and `typed` in C. `summary.quality`: `fakes`, `harmful_fakes`, `benign_fakes`, `field_ref`, `local_externs`, `sym_conflicts`, `hand_asm`.
- `summary.links`: targets by image link verdict. `summary.layout`: the audit of the units against the Splat maps (`rows`, `gaps`, `overlaps`, `relocated`, `unmodelled`, `resized`, `problems`).
- `targets[]`: `id`, `name`, `base` and `end` (the retail load range), `counts` (as `bin/status`), `link` (`status` `EXACT`, `DIFFERS` or `ERROR`, `payload`, `linked`, `first_mismatch` as a payload offset), `layout` (audit), `data`, and `units`: one `[offset, size, kind, status, name]` per Splat map row in address order. A row sits at `base + offset`. `kind` is `f` (game function), `s` (PsyQ function) or `d` (data or raw bytes).
- `libraries[]`: `name`, `versions` (PsyQ version to exact objects), `tiers` and `functions` (`target`, `addr`, `name`, `bytes`, `status`, `tier`, `version`, `score`), best match first. `tier` is `c`, `object`, `partial`, `assembly` or `unmatched`.
- `history[]`: one row per day with the numerator and denominator of each headline.

Function statuses: `pure` (matched C), `fake_match` (matched C with fake-match tricks), `asm` (original assembly, exact), `object` (library object), `assembly` (library assembly), `nonmatching` (C in progress), `open` (assembly). Other map rows are `typed` (compiled from C), `raw` or `header`.
