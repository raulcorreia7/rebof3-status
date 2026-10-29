// Replaces data/report.json with a fresh objdiff report, compact, so a publish commit changes the
// numbers and not the formatting.
// Usage: node render/publish.ts [report-file]   (--help prints this line)
//
// The default is ../rebof3/build/report.json: the file rebof3 `make report` writes when rebof3 is
// checked out beside this repository. The payload of the page is this file served as-is
// (vite.config.ts), which is why it is stored compact.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = "Usage: node render/publish.ts [report-file]";
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const source = resolve(
  process.argv[2] ?? fileURLToPath(new URL("../../rebof3/build/report.json", import.meta.url)),
);
if (!existsSync(source)) {
  console.error(`No report at ${source}. Run make report in rebof3, or pass the report file.`);
  console.error(USAGE);
  process.exit(1);
}
const target = fileURLToPath(new URL("../data/report.json", import.meta.url));
const json = JSON.stringify(JSON.parse(readFileSync(source, "utf8")));
writeFileSync(target, json);
console.log(`wrote data/report.json (${Buffer.byteLength(json)} bytes)`);
