// Checks the files `npm run build` writes into site/. Run the build first; `make test` does.

import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const site = new URL("../site/", import.meta.url);
const size = (name: string) => statSync(new URL(name, site)).size;
const text = (name: string) => readFileSync(new URL(name, site), "utf8");

test("the built site holds the page, the data and the pictures, none of them empty or broken", () => {
  assert.ok(existsSync(site), "site/ is missing: run `npm run build` first");
  for (const name of ["index.html", "report.json", "status-data.json", "status.json", "assets.json", "history.json", "progress.svg", "progress.png", "badge.svg"]) {
    assert.ok(size(name) > 200, `${name} is not empty`);
  }
  for (const name of ["index.html", "progress.svg", "badge.svg"]) {
    assert.doesNotMatch(text(name), /NaN|undefined/, name);
  }
});

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const share = (part: number, whole: number, digits = 1) => `${((100 * part) / whole).toFixed(digits)}%`;

test("the picture carries the three-part headline in reading order", () => {
  const svg = text("progress.svg");
  const headline = ["Game functions rebuilt in C", "Unique game code rebuilt in C", "Game data typed in C", "Assets decoded to open formats"];
  let at = -1;
  for (const label of headline) {
    const found = svg.indexOf(label, at + 1);
    assert.ok(found > at, `${label} is in the picture, after the previous headline`);
    at = found;
  }
  const { game_code: code } = fixture("status.json");
  const { totals: data } = fixture("status-data.json");
  const { totals: assets } = fixture("assets.json");
  assert.ok(svg.includes(share(code.exact, code.functions)), "game functions share");
  assert.ok(svg.includes(share(code.unique_exact, code.unique_functions)), "unique share");
  assert.ok(svg.includes(share(data.typed, data.data_payload)), "typed data share");
  assert.ok(svg.includes(share(assets.decoded_bytes, assets.bytes)), "assets share");
});

test("the picture never shows a target above 100% data and nothing is cut off", () => {
  const svg = text("progress.svg");
  assert.doesNotMatch(svg, /\b(10[1-9]|1[1-9]\d)\.\d+%/);
  assert.match(svg, /Functions matched/);
  assert.match(svg, /Hand-written asm/);
  assert.match(svg, /of game code bytes/);
  assert.doesNotMatch(svg, />0 \/ 4</);
});
