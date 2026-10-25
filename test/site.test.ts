// Checks the files `npm run build` writes into site/. Run the build first; `make test` does.

import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const site = new URL("../site/", import.meta.url);
const size = (name: string) => statSync(new URL(name, site)).size;
const text = (name: string) => readFileSync(new URL(name, site), "utf8");

test("the built site holds the page, the data and the pictures, none of them empty or broken", () => {
  assert.ok(existsSync(site), "site/ is missing: run `npm run build` first");
  for (const name of ["index.html", "report.json", "status-data.json", "history.json", "progress.svg", "progress.png", "badge.svg"]) {
    assert.ok(size(name) > 200, `${name} is not empty`);
  }
  for (const name of ["index.html", "progress.svg", "badge.svg"]) {
    assert.doesNotMatch(text(name), /NaN|undefined/, name);
  }
});

test("the picture carries the new headline in reading order", () => {
  const svg = text("progress.svg");
  const headline = ["Game code rebuilt in C", "Game code matched by bytes", "Fuzzy match", "Data typed and named"];
  let at = -1;
  for (const label of headline) {
    const found = svg.indexOf(label, at + 1);
    assert.ok(found > at, `${label} is in the picture, after the previous headline`);
    at = found;
  }
  assert.match(svg, /66\.6%/);
  assert.match(svg, /83\.0%/);
  assert.match(svg, /90\.7%/);
  assert.match(svg, /20\.04%/);
});

test("the picture never shows a target above 100% data and nothing is cut off", () => {
  const svg = text("progress.svg");
  assert.doesNotMatch(svg, /100\.2%/);
  assert.match(svg, /100\.0% · 9,978 \/ 9,978 B/);
  assert.match(svg, /PsyQ SDK: 99\.45% objects \(728\/732\)/);
  assert.match(svg, /average weighted by code bytes/);
  assert.match(svg, /Functions matched/);
  assert.match(svg, /Hand-written asm/);
  assert.match(svg, /66\.6% of game code bytes/);
  assert.doesNotMatch(svg, /58\.4%/);
  assert.doesNotMatch(svg, /0 \/ 4/);
});
