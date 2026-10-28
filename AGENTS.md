# Agent guide

This repository hosts the rebof3 status site; see [README.md](README.md).

## Changes

- Write only paths granted by the task.
- Keep `data/report.json` as produced by rebof3; never hand-edit it.
- Do not add game data.
- Format with dprint.
- Use MIT-licensed dependencies only; `make licenses` checks the allow-list.

## Verification

Run `make check` before committing. It checks formatting, types and dependency
licenses, then builds and tests the site. Run `npm ci` first if `node_modules`
is missing.

## Commits

Use `type(scope): subject` headers with an imperative, lowercase subject.
Do not add AI attribution, amend commits or force-push.
