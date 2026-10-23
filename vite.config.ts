import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// Builds the page into site/. `npm run build` then adds report.json, status-data.json, history.json and the pictures
// (render/snapshot.ts).
export default defineConfig({
  base: "./",
  plugins: [solid()],
  build: { outDir: "site", emptyOutDir: true, target: "es2022" },
});
