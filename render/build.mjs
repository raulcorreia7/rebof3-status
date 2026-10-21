// Builds the site into a folder: node render/build.mjs site [--watch]
// The work lives in build.ts; Node 22.18+ runs TypeScript directly.
import { buildSite } from "./build.ts";

const args = process.argv.slice(2);
await buildSite(args.find((arg) => !arg.startsWith("--")) ?? "site", { watch: args.includes("--watch") });
