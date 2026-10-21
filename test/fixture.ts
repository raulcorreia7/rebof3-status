import { readFileSync } from "node:fs";
import { buildModel } from "../src/model/index.ts";
import type { ProgressData } from "../src/types.ts";

export const data: ProgressData = JSON.parse(readFileSync(new URL("../progress.json", import.meta.url), "utf8"));
export const model = buildModel(data);
