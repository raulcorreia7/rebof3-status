# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)

[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Status of the Breath of Fire III decompilation: matched game code, the PsyQ SDK, typed data, code quality and the daily trend. Everything here is generated from the decompilation; do not edit `progress.json` by hand. Live page: <https://raulcorreia7.github.io/rebof3-status/>.

This repository holds only status data and its renderer. It has no source code, assembly, headers or game data.

## Where things live

The decompilation measures itself: `bin/progress` in rebof3 writes `progress.json`, because only rebof3 can read its Splat maps, link its targets and count its functions. This repository holds the page, the picture renderer and the published data, and no measuring code, so the page can change without touching the decompilation. The monorepo holds both as submodules, so its `scripts/publish-progress` is the one command that measures, copies `progress.json` here, commits and pushes; rebof3's post-merge hook runs it after each merge into `main`. The workflow here then draws the page and the picture from `progress.json`.

| File | Role |
| --- | --- |
| `progress.json` | The data. `scripts/publish-progress` copies it here. Schema 2 is described below. |
| `index.html`, `style.css`, `app.js` | The page. `app.js` draws `progress.json`; the build reuses it for the picture. |
| `render/` | Renders `progress.png`, `progress.svg` and `badge.svg` from `progress.json` with resvg. |
| `.github/workflows/pages.yml` | On each push to `main`, builds and deploys GitHub Pages. |

The map has two tile panels: game functions grouped by target and PsyQ library functions grouped by library. Block area is code bytes, with an 80-byte floor per function so a stub stays visible; one square is one function, coloured by status. `app.js` derives the game function records from the schema-2 `units` rows (`kind` `f`) before drawing, so the page needs no second data file.

## `progress.json` schema 2

- `schema`, `generated_at`, `commit` (the decompilation commit), `dirty`.
- `summary.code`, `summary.game`, `summary.sdk`: `functions`, `bytes`, `done_functions`, `done_bytes`, `statuses` (`status: [functions, bytes]`). `code` covers every function, `game` and `sdk` split it.
- `summary.data`: `bytes` outside code and `typed` in C. `summary.quality`: `fakes`, `harmful_fakes`, `benign_fakes`, `field_ref`, `local_externs`, `sym_conflicts`, `hand_asm`.
- `summary.links`: targets by image link verdict. `summary.layout`: the audit of the units against the Splat maps (`rows`, `gaps`, `overlaps`, `relocated`, `unmodelled`, `resized`, `problems`).
- `targets[]`: `id`, `name`, `base` and `end` (the retail load range), `counts` (as `bin/status`), `link` (`status` `EXACT`, `DIFFERS` or `ERROR`, `payload`, `linked`, `first_mismatch` as a payload offset), `layout` (audit), `data`, and `units`: one `[offset, size, kind, status, name]` per Splat map row in address order. A row sits at `base + offset`. `kind` is `f` (game function), `s` (PsyQ function) or `d` (data or raw bytes).
- `libraries[]`: `name`, `versions` (PsyQ version to exact objects), `tiers` and `functions` (`target`, `addr`, `name`, `bytes`, `status`, `tier`, `version`, `score`), best match first. `tier` is `c`, `object`, `partial`, `assembly` or `unmatched`.
- `history[]`: one row per day with the numerator and denominator of each headline.

Function statuses: `pure` (matched C), `fake_match` (matched C with fake-match tricks), `asm` (original assembly, exact), `object` (library object), `assembly` (library assembly), `nonmatching` (C in progress), `open` (assembly). Other map rows are `typed` (compiled from C), `raw` or `header`.

## Preview

```sh
npm ci --prefix render && node render/build.mjs site
python3 -m http.server -d site
```
