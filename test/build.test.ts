import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { buildSite } from "../render/build.ts";
import { data } from "./fixture.ts";

let out = "";
before(async () => {
  out = mkdtempSync(join(tmpdir(), "status-site-"));
  await buildSite(out);
});
after(() => undefined);

const read = (name: string) => readFileSync(join(out, name), "utf8");

test("the build writes the page, the data and the pictures, none of them empty", () => {
  for (const name of ["index.html", "app.js", "app.css", "progress.json", "progress.svg", "progress.png", "badge.svg"]) {
    assert.ok(existsSync(join(out, name)), name);
    assert.ok(statSync(join(out, name)).size > 200, `${name} is not empty`);
  }
});

test("progress.png is a PNG at the published width", () => {
  const png = readFileSync(join(out, "progress.png"));
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.readUInt32BE(16), 2400);
  assert.ok(png.length > 100_000);
});

test("progress.svg and badge.svg carry the headline numbers and no broken values", () => {
  const { game } = data.summary;
  const share = ((100 * game.done_functions) / game.functions).toFixed(1);
  for (const name of ["progress.svg", "badge.svg"]) {
    const svg = read(name);
    assert.ok(svg.startsWith("<svg"), name);
    assert.ok(svg.includes(`${share}%`), `${name} shows ${share}%`);
    assert.doesNotMatch(svg, /NaN|undefined|\[object/, name);
  }
  assert.match(read("badge.svg"), /C match/);
  assert.match(read("progress.svg"), /Game code: .*matched/);
  assert.match(read("progress.svg"), /Progress over time/);
});

test("the page bundle loads from index.html and keeps the data link", () => {
  const html = read("index.html");
  assert.match(html, /src="app\.js"/);
  assert.match(html, /href="app\.css"/);
  assert.match(html, /<noscript>This page needs JavaScript to draw the charts\./);
  assert.deepEqual(JSON.parse(read("progress.json")).summary, data.summary);
});
