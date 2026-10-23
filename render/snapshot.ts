// Writes the files of the site that are not the page: the report data, progress.svg,
// progress.png and badge.svg. Usage: node render/snapshot.ts [out-dir] [data-dir]
//
// The default data directory is test/fixtures, the trimmed sample report committed with the
// renderer; a publisher passes the directory holding the real report.json, status-data.json and
// history.json.

import { Resvg } from "@resvg/resvg-js";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildModel } from "../src/model/report.ts";
import { badge } from "../src/snapshot/badge.ts";
import { renderPoster } from "../src/snapshot/poster.ts";
import type { History, Report, StatusData } from "../src/types.ts";

const PNG_WIDTH = 2400;
const DATA_FILES = ["report.json", "status-data.json", "history.json"];
const out = process.argv[2] ?? "site";
const data = resolve(process.argv[3] ?? fileURLToPath(new URL("../test/fixtures/", import.meta.url)));

const read = <T>(name: string): T => JSON.parse(readFileSync(join(data, name), "utf8")) as T;

mkdirSync(out, { recursive: true });
for (const name of DATA_FILES) copyFileSync(join(data, name), join(out, name));
const model = buildModel(read<Report>("report.json"), read<StatusData>("status-data.json"), read<History>("history.json"));
const svg = renderPoster(model);
writeFileSync(join(out, "progress.svg"), svg);
writeFileSync(join(out, "badge.svg"), badge(model));
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: PNG_WIDTH },
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
}).render();
writeFileSync(join(out, "progress.png"), png.asPng());
console.log(`wrote ${out}/ (${png.width}x${png.height} png)`);
