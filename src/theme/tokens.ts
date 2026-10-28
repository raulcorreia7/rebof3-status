// Colour tokens for the dark and the light theme. The page writes them to CSS custom properties
// (theme/apply.ts), the charts read them from here, and the picture uses the dark set.

import { statusProp } from "../model/status.ts";
import type { Status } from "../types.ts";

export interface Tokens {
  bg: string;
  card: string;
  line: string;
  ink: string;
  mute: string;
  accent: string;
  track: string;
  /** The SDK treemap cells: neutral, and no progress colour. */
  sdk: string;
  status: Record<Status, string>;
}

export const DARK: Tokens = {
  bg: "#0d1117",
  card: "#161b22",
  line: "#30363d",
  ink: "#c9d1d9",
  mute: "#8b949e",
  accent: "#58a6ff",
  track: "#21262d",
  sdk: "#6a6483",
  status: {
    pure: "#2ea043",
    nonmatching: "#d29922",
    open: "#4b535d",
    object: "#26a69a",
    asm: "#79c0ff",
    assembly: "#db6d28",
  },
};

const LIGHT: Tokens = {
  bg: "#ffffff",
  card: "#f6f8fa",
  line: "#d0d7de",
  ink: "#1f2328",
  mute: "#59636e",
  accent: "#0969da",
  track: "#e6eaef",
  sdk: "#9a94b8",
  status: {
    pure: "#1a7f37",
    nonmatching: "#bf8700",
    open: "#8c959f",
    object: "#0e8a80",
    asm: "#218bff",
    assembly: "#bc4c00",
  },
};

export type Scheme = "dark" | "light";
export const tokensFor = (scheme: Scheme): Tokens => (scheme === "dark" ? DARK : LIGHT);

/** CSS custom properties for a token set: `--bg`, `--ink`, `--st-pure`. */
export function cssVars(tokens: Tokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === "string") {
      vars[`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = value;
    }
  }
  for (const [key, value] of Object.entries(tokens.status)) vars[statusProp(key)] = value;
  return vars;
}
