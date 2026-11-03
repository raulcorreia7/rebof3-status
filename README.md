# bof3-status

[![C match](https://raulcorreia7.github.io/bof3-status/badge.svg)](https://raulcorreia7.github.io/bof3-status/)
[![Decompilation status](https://raulcorreia7.github.io/bof3-status/progress.png)](https://raulcorreia7.github.io/bof3-status/)

Progress of the Breath of Fire III decompilation: **<https://raulcorreia7.github.io/bof3-status/>**

This repository holds the published objdiff report and the page that renders it; the report's shape
and the page's structure are in [docs/site.md](docs/site.md). The audio player is maintained in [bof3-player](https://github.com/raulcorreia7/bof3-player).
Disc and archive tools are maintained in [bof3-tools](https://github.com/raulcorreia7/bof3-tools).

A fan project, not affiliated with or endorsed by Capcom. Breath of Fire is a Capcom trademark. No
game data is included; bring your own disc.

## Publish

`data/report.json` is the only input, and `deploy.yml` publishes every push to `main`. To publish a
fresh objdiff report, with bof3-decomp checked out as `decomp/` beside this folder in the [monorepo](https://github.com/raulcorreia7/bof3):

```sh
npm run report   # copies ../decomp/build/report.json into data/report.json
                 # (in decomp: meson compile -C build/meson report)
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

`make check` runs the format check, `npm run lint`, `npm run licenses` and `npm test`; `make help`
lists the targets.

## License

See [CONTRIBUTING.md](CONTRIBUTING.md), the [code of conduct](CODE_OF_CONDUCT.md) and the
[security policy](SECURITY.md). [MIT](LICENSE). The picture uses DejaVu Sans, shipped in [render/fonts/](render/fonts/) under its
own licence.
