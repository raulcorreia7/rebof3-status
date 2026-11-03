# Contributing

All contributions follow the [code of conduct](CODE_OF_CONDUCT.md). Contributions are under the
repository's [MIT license](LICENSE). `AGENTS.md` is optional guidance for coding agents; people can
ignore it.

## Set up

You need Node.js 22 and, for formatting, the standalone
[dprint](https://github.com/dprint/dprint/releases/latest) executable.

```sh
git clone https://github.com/raulcorreia7/bof3-status.git
cd bof3-status
npm ci
npm run dev    # dev server on the published report
make check     # format, type check, licenses and tests; CI runs the same checks
```

## What to change

- The page and the picture: `src/` and `render/`. [docs/site.md](docs/site.md) describes the
  structure.
- The numbers: `data/report.json` is the objdiff report that bof3-decomp produces. Do not edit it by hand;
  a maintainer publishes a fresh report with `npm run report`.
- Dependencies: `npm run licenses` allows only the licenses listed in `package.json`.

No game data belongs in the repository.

## Submit a change

Create a branch and keep each change focused. Use commit subjects such as
`fix(page): label the match bar`. Describe the behavior and the checks in the pull request.
