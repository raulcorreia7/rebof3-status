// Builds the site: the bundled page, progress.svg, progress.png and badge.svg from progress.json.

import { build as bundle, context } from "esbuild";
import { Resvg } from "@resvg/resvg-js";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildModel } from "../src/model/index.ts";
import { badge } from "../src/snapshot/badge.ts";
import { renderPoster } from "../src/snapshot/poster.ts";
import type { ProgressData } from "../src/types.ts";

const root = (name: string): string => fileURLToPath(new URL(`../${name}`, import.meta.url));
const PNG_WIDTH = 2400;

const bundleOptions = (out: string) => ({
  entryPoints: { app: root("src/main.tsx") },
  outdir: out,
  bundle: true,
  format: "esm" as const,
  target: "es2022",
  jsx: "automatic" as const,
  jsxImportSource: "preact",
  minify: true,
  sourcemap: true,
  legalComments: "none" as const,
  logLevel: "warning" as const,
});

/** Write the pictures from progress.json: progress.svg, progress.png and badge.svg. */
export function renderPictures(out: string): { width: number; height: number } {
  const model = buildModel(JSON.parse(readFileSync(root("progress.json"), "utf8")) as ProgressData);
  const svg = renderPoster(model);
  writeFileSync(`${out}/progress.svg`, svg);
  writeFileSync(`${out}/badge.svg`, badge(model));
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: PNG_WIDTH },
    font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
  }).render();
  writeFileSync(`${out}/progress.png`, png.asPng());
  return { width: png.width, height: png.height };
}

/** Build the whole site into `out`. With `watch`, rebuild the bundle when a source changes. */
export async function buildSite(out: string, { watch = false } = {}): Promise<void> {
  mkdirSync(out, { recursive: true });
  for (const file of ["index.html", "progress.json"]) copyFileSync(root(file), `${out}/${file}`);
  if (watch) {
    const watcher = await context(bundleOptions(out));
    await watcher.watch();
  } else {
    await bundle(bundleOptions(out));
  }
  const png = renderPictures(out);
  console.log(`wrote ${out}/ (${png.width}x${png.height} png)`);
}
