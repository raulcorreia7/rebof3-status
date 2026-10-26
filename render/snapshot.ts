// Writes the files of the site that are not the page: progress.svg, progress.png and badge.svg.
// Usage: node render/snapshot.ts [out-dir] [report-file]
//
// The default report is data/report.json, the published numbers; Vite copies the same file to the
// page (vite.config.ts). A publisher replaces data/report.json and commits it.

import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { modelFromReport } from "../src/model/report.ts";
import { badge } from "../src/snapshot/badge.ts";
import { renderPoster } from "../src/snapshot/poster.ts";

const PNG_WIDTH = 2400;
const out = process.argv[2] ?? "site";
const report = resolve(process.argv[3] ?? fileURLToPath(new URL("../data/report.json", import.meta.url)));

mkdirSync(out, { recursive: true });
const model = modelFromReport(JSON.parse(readFileSync(report, "utf8")));
const svg = renderPoster(model);
writeFileSync(join(out, "progress.svg"), svg);
writeFileSync(join(out, "badge.svg"), badge(model));
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: PNG_WIDTH },
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
}).render();
writeFileSync(join(out, "progress.png"), png.asPng());
console.log(`wrote ${out}/ (${png.width}x${png.height} png)`);
