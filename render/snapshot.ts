// Writes the files of the site that are not the page: the report data, progress.svg,
// progress.png and badge.svg. Usage: node render/snapshot.ts [out-dir] [data-dir]
//
// The default data directory is test/fixtures, the trimmed sample report committed with the
// renderer; a publisher passes the directory holding the real report.json, status-data.json,
// history.json and, when it measured them, status.json and assets.json.

import { Resvg } from "@resvg/resvg-js";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { modelFromFiles } from "../src/model/report.ts";
import { badge } from "../src/snapshot/badge.ts";
import { renderPoster } from "../src/snapshot/poster.ts";

const PNG_WIDTH = 2400;
const DATA_FILES = ["report.json", "status-data.json", "history.json"];
const OPTIONAL_FILES = ["status.json", "assets.json"];
const out = process.argv[2] ?? "site";
const data = resolve(process.argv[3] ?? fileURLToPath(new URL("../test/fixtures/", import.meta.url)));

const read = (name: string): unknown => JSON.parse(readFileSync(join(data, name), "utf8"));
const readOptional = (name: string): unknown => (existsSync(join(data, name)) ? read(name) : null);

mkdirSync(out, { recursive: true });
for (const name of DATA_FILES) copyFileSync(join(data, name), join(out, name));
// An optional file the data lacks is removed: a copy left by an earlier run would come from
// another measurement.
for (const name of OPTIONAL_FILES) {
  if (existsSync(join(data, name))) copyFileSync(join(data, name), join(out, name));
  else rmSync(join(out, name), { force: true });
}
const model = modelFromFiles({
  report: read("report.json"),
  data: read("status-data.json"),
  history: read("history.json"),
  census: readOptional("status.json"),
  assets: readOptional("assets.json"),
});
const svg = renderPoster(model);
writeFileSync(join(out, "progress.svg"), svg);
writeFileSync(join(out, "badge.svg"), badge(model));
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: PNG_WIDTH },
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
}).render();
writeFileSync(join(out, "progress.png"), png.asPng());
console.log(`wrote ${out}/ (${png.width}x${png.height} png)`);
