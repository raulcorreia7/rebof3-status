// Renders progress.json into a site folder: the page files, progress.svg, progress.png, badge.svg.
// Run from the repository root: node render/build.mjs site
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { badge, render } from "../app.js";

const root = (name) => fileURLToPath(new URL(`../${name}`, import.meta.url));
const OUT = process.argv[2] ?? "site";
const PNG_WIDTH = 2400;

const data = JSON.parse(readFileSync(root("progress.json"), "utf8"));
const svg = render(data);
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/vendor`, { recursive: true });
for (const file of ["index.html", "style.css", "app.js", "layout.js", "vendor/d3-hierarchy.js", "progress.json"]) copyFileSync(root(file), `${OUT}/${file}`);
writeFileSync(`${OUT}/progress.svg`, svg);
writeFileSync(`${OUT}/badge.svg`, badge(data));
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: PNG_WIDTH },
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
}).render();
writeFileSync(`${OUT}/progress.png`, png.asPng());
console.log(`wrote ${OUT}/ (${png.width}x${png.height} png)`);
