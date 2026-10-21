import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const site = new URL("site/", root);

test("npm run build writes the page and the pictures, none of them empty or broken", () => {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  for (const name of ["index.html", "progress.json", "progress.svg", "progress.png", "badge.svg"]) {
    assert.ok(statSync(new URL(name, site)).size > 200, `${name} is not empty`);
  }
  for (const name of ["index.html", "progress.svg", "badge.svg"]) {
    assert.doesNotMatch(readFileSync(new URL(name, site), "utf8"), /NaN|undefined/, name);
  }
});
