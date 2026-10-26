import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// Builds the page into site/. `data/` holds the published report.json, which Vite serves in dev and
// copies to site/ in the build; `npm run build` then writes the pictures (render/snapshot.ts).
export default defineConfig({
  base: "./",
  publicDir: "data",
  plugins: [solid(), tailwindcss()],
  build: { outDir: "site", emptyOutDir: true, target: "es2022" },
});
