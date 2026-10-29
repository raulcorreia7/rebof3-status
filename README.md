# rebof3-status

[![C match](https://raulcorreia7.github.io/rebof3-status/badge.svg)](https://raulcorreia7.github.io/rebof3-status/)
[![Decompilation status](https://raulcorreia7.github.io/rebof3-status/progress.png)](https://raulcorreia7.github.io/rebof3-status/)

Progress of the Breath of Fire III decompilation: **<https://raulcorreia7.github.io/rebof3-status/>**

This repository holds the published objdiff report and the page that renders it; the report's shape
and the page's structure are in [docs/site.md](docs/site.md). The audio player and the disc and
archive tools are in [bof3player](https://github.com/raulcorreia7/bof3player).

A fan project, not affiliated with or endorsed by Capcom. Breath of Fire is a Capcom trademark. No
game data is included; bring your own disc.

## Publish

`data/report.json` is the only input, and `deploy.yml` publishes every push to `main`. To publish a
fresh objdiff report, with rebof3 checked out as a sibling:

```sh
npm run report   # copies ../rebof3/build/report.json into data/report.json
git commit -am "data: publish report"
git push
```

## Develop

Needs Node.js 22 and, for formatting, the standalone [dprint](https://github.com/dprint/dprint/releases/latest) executable.

```sh
npm ci
npm run dev      # dev server on the published report
npm run build    # site/ plus the pictures
npm test         # model totals, from data/report.json
npm run lint     # tsc
npm run format   # dprint: ts, tsx, json and md
npm run licenses # dependency licence gate; reviewed exceptions live in package.json
```

## License

[MIT](LICENSE). The picture uses DejaVu Sans, shipped in [render/fonts/](render/fonts/) under its
own licence.
