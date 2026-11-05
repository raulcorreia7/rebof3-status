# Agent guide

bof3-status is the progress site of the *Breath of Fire III* decompilation: a Vite and Solid page
over the decompilation's objdiff report. Read [README.md](README.md) first, then
[docs/site.md](docs/site.md).

## Where things are

| Path                       | What it holds                                                 | Doc                                               |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `data/report.json`         | The published objdiff report, the only data input             | [docs/site.md](docs/site.md#data-file)            |
| `src/model/`               | The report schema, the adapter and the page model             | [docs/site.md](docs/site.md#file-layout)          |
| `src/views/`               | The Solid views and the app shell                             | [docs/site.md](docs/site.md#file-layout)          |
| `src/strings.ts`           | All page copy                                                 | [docs/site.md](docs/site.md#add-or-change-things) |
| `src/snapshot/`, `render/` | The `progress.svg` poster, `badge.svg` and the publish script | [docs/site.md](docs/site.md#file-layout)          |
| `test/`                    | `node:test` checks of the model totals                        | [docs/site.md](docs/site.md#file-layout)          |
| `Makefile`                 | `build`, `test`, `format`, `lint`, `licenses`, `check`        | `make help`                                       |

## Changes

- Write only paths granted by the task.
- Keep `data/report.json` as produced by bof3-decomp; never hand-edit it.
- Do not add game data.
- Format with dprint.
- Add only dependencies whose license `npm run licenses` allows.

## Verification

Run `make check` before committing.

## Commits

Use `type(scope): subject` headers with an imperative, lowercase subject.
Do not add AI attribution, amend commits or force-push.

## Writing

Docs, comments, commit messages and pull requests follow one standard.

- **Current.** Present tense, no history.
- **What, not how.** Say what a thing does and why. The code shows how.
- **ASD-STE100** is the basis for technical text: short sentences, one instruction per sentence,
  active voice, one term for one concept, numbered steps for a procedure. Exact technical terms
  stay.
- **Orwell's six rules** ("Politics and the English Language", 1946):
  1. Never use a metaphor, simile or other figure of speech that you are used to seeing in print.
  2. Never use a long word where a short one will do.
  3. If it is possible to cut a word out, always cut it out.
  4. Never use the passive where you can use the active.
  5. Never use a foreign phrase, a scientific word or a jargon word if you can think of an everyday
     English equivalent.
  6. Break any of these rules sooner than say anything outright barbarous.
- Comments say what, never how: one line, only where a name cannot say it ([standard](https://github.com/raulcorreia7/bof3/blob/main/docs/standard.md#comments)).
