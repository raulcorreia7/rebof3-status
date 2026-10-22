// Theme selection: automatic (follow the system), light or dark. The choice is kept in
// localStorage when the browser allows it; the page works without.

import { cssVars, tokensFor, type Scheme, type Tokens } from "./tokens.ts";

export type Mode = "auto" | "light" | "dark";
const STORAGE_KEY = "rebof3-status-theme";
const dark = () => window.matchMedia("(prefers-color-scheme: dark)");

export function storedMode(): Mode {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function saveMode(mode: Mode): void {
  try {
    if (mode === "auto") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private window or blocked storage: the choice lasts until the page closes */
  }
}

const schemeOf = (mode: Mode): Scheme => (mode === "auto" ? (dark().matches ? "dark" : "light") : mode);

/** Write the tokens of the mode's scheme to the page and return them. */
export function applyMode(mode: Mode): { scheme: Scheme; tokens: Tokens } {
  const scheme = schemeOf(mode);
  const tokens = tokensFor(scheme);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(cssVars(tokens))) root.style.setProperty(name, value);
  root.dataset.theme = scheme;
  root.style.colorScheme = scheme;
  return { scheme, tokens };
}

/** Call `listener` when the system scheme changes. */
export function watchSystemScheme(listener: () => void): () => void {
  const query = dark();
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
