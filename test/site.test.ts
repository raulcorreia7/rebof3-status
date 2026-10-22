// Checks the files `npm run build` writes into site/. Run the build first; `make test` does.

import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const site = new URL("../site/", import.meta.url);

test("the built site holds the page and the pictures, none of them empty or broken", () => {
  assert.ok(existsSync(site), "site/ is missing: run `npm run build` first");
  for (const name of ["index.html", "progress.json", "progress.svg", "progress.png", "badge.svg"]) {
    assert.ok(statSync(new URL(name, site)).size > 200, `${name} is not empty`);
  }
  for (const name of ["index.html", "progress.svg", "badge.svg"]) {
    assert.doesNotMatch(readFileSync(new URL(name, site), "utf8"), /NaN|undefined/, name);
  }
});
