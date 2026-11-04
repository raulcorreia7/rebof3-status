# Agent guide

bof3-status is the progress site of the *Breath of Fire III* decompilation. Read [README.md](README.md) first, then [docs/site.md](docs/site.md) for the code you change.

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
