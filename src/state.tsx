// Shared page state: the model, the route (kept in the URL hash) and the theme.

import { createContext } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { formatHash, parseHash, type Route } from "./model/route.ts";
import { applyMode, saveMode, schemeOf, storedMode, watchSystemScheme, type Mode } from "./theme/apply.ts";
import type { Scheme, Tokens } from "./theme/tokens.ts";
import type { Model } from "./types.ts";

export interface Navigate {
  /** Change part of the route. `replace` edits the current history entry (typing, toggles). */
  (patch: Partial<Route>, replace?: boolean): void;
}

export interface Page {
  model: Model;
  route: Route;
  go: Navigate;
  /** The hash of the current route with `patch` applied, for a link's href. */
  href: (patch: Partial<Route>) => string;
  tokens: Tokens;
  scheme: Scheme;
  mode: Mode;
  setMode: (mode: Mode) => void;
}

export const PageContext = createContext<Page>(undefined as unknown as Page);
export const usePage = (): Page => useContext(PageContext);

/** The route, in sync with the URL hash in both directions. */
export function useRoute(): [Route, Navigate] {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const current = useRef(route);
  current.current = route;

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const go = useCallback<Navigate>((patch, replace = false) => {
    const next = { ...current.current, ...patch };
    const hash = formatHash(next);
    if (hash === formatHash(current.current)) return;
    const url = hash || `${window.location.pathname}${window.location.search}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setRoute(next);
  }, []);
  return [route, go];
}

/** The theme mode and its tokens; applying them writes the CSS custom properties. */
export function useTheme(): { mode: Mode; setMode: (mode: Mode) => void; scheme: Scheme; tokens: Tokens } {
  const [mode, setModeState] = useState<Mode>(storedMode);
  const [applied, setApplied] = useState(() => applyMode(mode));
  useEffect(() => {
    setApplied(applyMode(mode));
    return mode === "auto" ? watchSystemScheme(() => setApplied(applyMode("auto"))) : undefined;
  }, [mode]);
  const setMode = useCallback((next: Mode) => {
    saveMode(next);
    setModeState(next);
  }, []);
  return { mode, setMode, scheme: schemeOf(mode), tokens: applied.tokens };
}
