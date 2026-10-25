# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)

[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Progress of the Breath of Fire III decompilation: **<https://raulcorreia7.github.io/rebof3-status/>**

The page shows game code rebuilt in C, bytes matched, fuzzy match, typed data, the PsyQ SDK
apart, and the daily trend. This repository holds only the numbers and their renderer: no source
code, assembly or game data.

## Data

| File               | Written by                                            | Holds                                                         |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------- |
| `report.json`      | `objdiff-cli report generate` (rebof3 `make report`) | Units and categories (`game`, `sdk`, `hand-asm`), bytes, fuzzy. |
| `status-data.json` | rebof3 `bin/status --data`                            | Typed and named data per target.                              |
| `history.json`     | the publisher                                         | One row of headline numbers per day.                          |

The numbers live on the `gh-pages` branch and are generated: never edit them by hand.
`test/fixtures/` holds a trimmed real copy, so the build and tests run without the decompilation.

## Run

```sh
npm ci
npm run dev      # dev server on the fixtures
npm run build    # site/ plus the pictures; needs the DejaVu Sans font (fonts-dejavu-core)
npm test         # after a build; `make test` runs both
node render/snapshot.ts site /path/to/report-dir   # render other numbers
```

## Deploy

`deploy.yml` runs on every push to `main`, pull request and manual dispatch: lint, build, test,
then render the page with the numbers on `gh-pages` and publish it (pull requests only check).
New numbers come from the monorepo: `make publish` pushes them to `gh-pages` when one changed and
starts the run; `make integrate` does that for every green rebof3 `main`.

Change the page: [docs/site.md](docs/site.md).
