# Agent guide

This repository hosts the rebof3 status site; see [README.md](README.md).

## Changes

- Write only paths granted by the task.
- Keep `data/report.json` as produced by rebof3; never hand-edit it.
- Do not add game data.
- Format with dprint.
- Add only dependencies whose license `make licenses` allows.

## Verification

Run `make check` before committing.

## Commits

Use `type(scope): subject` headers with an imperative, lowercase subject.
Do not add AI attribution, amend commits or force-push.
