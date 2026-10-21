// Colour tokens for the dark and the light theme. The page writes them to CSS custom properties
// (theme/apply.ts), the charts read them from here, and the picture uses the dark set.

import { statusProp } from "../model/status.ts";
import type { DataStatus, Status, Tier } from "../types.ts";

export interface Tokens {
  bg: string;
  card: string;
  line: string;
  ink: string;
  mute: string;
  accent: string;
  track: string;
  /** Hatch colours of reserved space. */
  hatch: string;
  hatchStripe: string;
  danger: string;
  status: Record<Status | DataStatus, string>;
  tier: Record<Tier, string>;
}

export const DARK: Tokens = {
  bg: "#0d1117",
  card: "#161b22",
  line: "#30363d",
  ink: "#c9d1d9",
  mute: "#8b949e",
  accent: "#58a6ff",
  track: "#21262d",
  hatch: "#21262d",
  hatchStripe: "#3b434d",
  danger: "#f85149",
  status: {
    pure: "#2ea043",
    fake_match: "#7ee787",
    asm: "#79c0ff",
    object: "#26a69a",
    assembly: "#db6d28",
    nonmatching: "#d29922",
    open: "#4b535d",
    typed: "#a371f7",
    raw: "#30363d",
    header: "#6e7681",
  },
  tier: { c: "#2ea043", object: "#26a69a", partial: "#e3b341", assembly: "#db6d28", unmatched: "#4b535d" },
};

export const LIGHT: Tokens = {
  bg: "#ffffff",
  card: "#f6f8fa",
  line: "#d0d7de",
  ink: "#1f2328",
  mute: "#59636e",
  accent: "#0969da",
  track: "#e6eaef",
  hatch: "#e6eaef",
  hatchStripe: "#b6bec7",
  danger: "#cf222e",
  status: {
    pure: "#1a7f37",
    fake_match: "#4ac26b",
    asm: "#218bff",
    object: "#0e8a80",
    assembly: "#bc4c00",
    nonmatching: "#bf8700",
    open: "#8c959f",
    typed: "#8250df",
    raw: "#d0d7de",
    header: "#afb8c1",
  },
  tier: { c: "#1a7f37", object: "#0e8a80", partial: "#bf8700", assembly: "#bc4c00", unmatched: "#8c959f" },
};

export type Scheme = "dark" | "light";
export const tokensFor = (scheme: Scheme): Tokens => (scheme === "dark" ? DARK : LIGHT);

/** CSS custom properties for a token set: `--bg`, `--ink`, `--st-pure`, `--tier-c`. */
export function cssVars(tokens: Tokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === "string") vars[`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = value;
  }
  for (const [key, value] of Object.entries(tokens.status)) vars[statusProp(key)] = value;
  for (const [key, value] of Object.entries(tokens.tier)) vars[`--tier-${key}`] = value;
  return vars;
}
