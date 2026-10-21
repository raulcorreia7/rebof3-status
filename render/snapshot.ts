// Writes the files of the site that are not the page: progress.json, progress.svg, progress.png
// and badge.svg, all from progress.json. Usage: node render/snapshot.ts [out-dir]

import { Resvg } from "@resvg/resvg-js";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildModel } from "../src/model/index.ts";
import { badge } from "../src/snapshot/badge.ts";
import { renderPoster } from "../src/snapshot/poster.ts";
import type { ProgressData } from "../src/types.ts";

const PNG_WIDTH = 2400;
const source = fileURLToPath(new URL("../progress.json", import.meta.url));
const out = process.argv[2] ?? "site";

mkdirSync(out, { recursive: true });
copyFileSync(source, `${out}/progress.json`);
const model = buildModel(JSON.parse(readFileSync(source, "utf8")) as ProgressData);
const svg = renderPoster(model);
writeFileSync(`${out}/progress.svg`, svg);
writeFileSync(`${out}/badge.svg`, badge(model));
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: PNG_WIDTH },
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
}).render();
writeFileSync(`${out}/progress.png`, png.asPng());
console.log(`wrote ${out}/ (${png.width}x${png.height} png)`);
