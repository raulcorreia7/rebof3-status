# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)

[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Progress of the Breath of Fire III decompilation: **<https://raulcorreia7.github.io/rebof3-status/>**

The page has three parts: game code rebuilt in C (every copy, and each repeated function once),
game data typed in C, and the disc assets the asset tools read, which never count as
decompilation. The PsyQ SDK and the hand-written assembly are shown apart, with the daily trend.
This repository holds only the numbers and their renderer: no source code, assembly or game data.

## Data

| File               | Written by                                            | Holds                                                         |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------- |
| `report.json`      | `objdiff-cli report generate` (rebof3 `make report`) | Units and categories (`game`, `sdk`, `hand-asm`), bytes, fuzzy: the map and the function list. |
| `status.json`      | rebof3 `bin/status --json`                            | The game code headline (`game_code`): every target map, all copies and each body once.        |
| `status-data.json` | rebof3 `bin/status --data`                            | Typed data per target; `raw_c` byte arrays named by address are not typed.                    |
| `assets.json`      | the publisher, from `bin/rebof3 assets`               | Disc assets by kind: decoded, copied as stored, round trip. Program code left out.            |
| `history.json`     | the publisher                                         | One row of headline numbers per day.                                                          |

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
