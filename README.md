# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)

[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Status of the Breath of Fire III decompilation: matched game code, the PsyQ SDK, typed data, code quality and the daily trend. Everything here is generated from the decompilation; do not edit `progress.json` by hand. Live page: <https://raulcorreia7.github.io/rebof3-status/>.

This repository holds only status data and its renderer. It has no source code, assembly, headers or game data.

| File | Role |
| --- | --- |
| `progress.json` | The data. `scripts/publish-progress` in the monorepo copies it here. Schema 1 is described below. |
| `index.html`, `style.css`, `app.js` | The page. `app.js` draws `progress.json`; the build reuses it for the picture. |
| `render/` | Renders `progress.png`, `progress.svg` and `badge.svg` from `progress.json` with resvg. |
| `.github/workflows/pages.yml` | On each push to `main`, builds and deploys GitHub Pages. |

## `progress.json` schema 1

- `schema`, `generated_at`, `commit` (the decompilation commit), `dirty`.
- `summary.code`, `summary.game`, `summary.sdk`: `functions`, `bytes`, `done_functions`, `done_bytes`, `statuses` (`status: [functions, bytes]`). `code` covers every function, `game` and `sdk` split it.
- `summary.data`: `bytes` outside code and `typed` in C. `summary.quality`: `aids`, `harmful_aids`, `benign_aids`, `field_ref`, `local_externs`, `sym_conflicts`, `hand_asm`.
- `targets[]`: `id`, `name`, `data`, and `functions` (`addr`, `name`, `bytes`, `status`) of game code.
- `libraries[]`: `name`, `versions` (PsyQ version to object-linked units) and `functions` (`target`, `addr`, `name`, `bytes`, `status`).
- `history[]`: one row per day with the numerator and denominator of each headline.

Statuses: `pure` (matched C), `aided` (matched C with aids), `asm` (original assembly, exact), `object` (library object), `assembly` (library assembly), `nonmatching` (C in progress), `open` (assembly).

## Preview

```sh
npm ci --prefix render && node render/build.mjs site
python3 -m http.server -d site
```
