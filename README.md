# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)
[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Progress of the Breath of Fire III decompilation: **<https://raulcorreia7.github.io/rebof3-status/>**

The page shows the game code rebuilt in C: the totals, the map of the game's parts and images, and
a search for any function. Open a part or an image to list its functions. The PsyQ SDK and the
hand-written assembly are shown apart. This repository holds only the numbers and their renderer:
no source code, assembly or game data.

A fan project, not affiliated with or endorsed by Capcom. Breath of Fire is a Capcom trademark. No
game data is included; bring your own disc.

## Data

`data/report.json` is the only input: the objdiff report that rebof3 `make report` writes to
`rebof3/build/report.json`. It carries source-file units with their functions, and the `game`,
`sdk` and `hand-asm` progress categories; each function has its code bytes and fuzzy match. The
page and the picture are built from that one file.

## Run

```sh
npm ci && npm run build && npm test   # clean-clone build and test; `make check` adds the type check
npm run dev      # dev server on data/report.json
npm run build    # site/ plus the pictures; the font ships in render/fonts/
node render/snapshot.ts site data/report.json   # render the pictures for another report
```

## Publish

From this repository, with rebof3 checked out as a sibling:

```sh
cp ../rebof3/build/report.json data/report.json
git commit -am "data: publish report"
git push
```

## Deploy

`deploy.yml` runs on every push to `main`, pull request and manual dispatch: type check, build, test,
then publish the built `site/` (pull requests only check). The numbers are the committed
`data/report.json`, so a new report is a commit. Change the page: [docs/site.md](docs/site.md).

## License

[MIT](LICENSE).
