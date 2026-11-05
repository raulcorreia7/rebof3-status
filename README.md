# bof3-status

[![CI](https://github.com/raulcorreia7/bof3-status/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/raulcorreia7/bof3-status/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![C match](https://raulcorreia7.github.io/bof3-status/badge.svg)](https://raulcorreia7.github.io/bof3-status/)

The progress site for the *Breath of Fire III* decompilation:
**<https://raulcorreia7.github.io/bof3-status/>**

It renders the published objdiff report of [bof3-decomp](https://github.com/raulcorreia7/bof3-decomp)
as a treemap of the game's parts and images, a function search and a progress picture. This
repository holds the report and the page that renders it.

No game data is included. This is a fan project, not affiliated with or endorsed by Capcom.
*Breath of Fire* is Capcom's trademark.

## How progress is measured

- A function counts as rebuilt in C only when its objdiff fuzzy match is exactly 100 percent: the C
  source compiles to the same bytes as the original code.
- A draft in C compiles but still differs. It does not count as rebuilt.
- Figures come by function count and by code bytes. The PsyQ SDK and hand-written assembly stay out
  of every game code figure.

The page repeats this under "How progress is measured". The report fields and the status rules are
in [docs/site.md](docs/site.md#data-file).

## Use

Open the site. It links `report.json` and `progress.png`, and also serves `progress.svg` and
`badge.svg`. To show the badge elsewhere, link
`https://raulcorreia7.github.io/bof3-status/badge.svg`.

## Develop

You need Node.js 22 or later and, for formatting, the standalone
[dprint](https://github.com/dprint/dprint/releases/latest) executable.

```sh
git clone https://github.com/raulcorreia7/bof3-status.git
cd bof3-status
npm ci
npm run dev      # dev server on the published report
npm run build    # site/ plus the pictures
npm test         # model totals, from data/report.json
npm run lint     # tsc
npm run format   # dprint: ts, tsx, json and md
npm run licenses # dependency license gate; reviewed exceptions live in package.json
```

`make check` runs the format check, `npm run lint`, `npm run licenses` and `npm test`; `make help`
lists the targets.

## Publish

`deploy.yml` publishes every push to `main` and every manual or dispatched run. A deploy takes the
newest report: the `report.json` asset of the [`progress` release](https://github.com/raulcorreia7/bof3-status/releases/tag/progress)
when it exists, else the committed `data/report.json`.

To publish fresh progress, with bof3-decomp checked out as `decomp/` beside this folder in the
[bof3 workspace](https://github.com/raulcorreia7/bof3):

```sh
(cd ../decomp && meson compile -C build/meson report)
gh release upload progress ../decomp/build/report.json --clobber
gh workflow run deploy.yml
```

Commit `data/report.json` (`npm run report`) when the data shape changes, so pull requests test it.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), the [code of conduct](CODE_OF_CONDUCT.md) and the
[security policy](SECURITY.md). Run `make check` before a pull request.

## License

MIT. See [LICENSE](LICENSE). The picture uses DejaVu Sans, shipped in [render/fonts/](render/fonts/)
under its own license.
