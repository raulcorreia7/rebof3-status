// The page state in one place: the route (kept in the URL hash, so every view is a link), the
// theme and how many table rows are shown. Views read it through usePage().

import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  useContext,
} from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { PAGE_STEP } from "./model/browse.ts";
import { formatHash, isLegacyPath, pagePath, parseHash, type Route } from "./model/route.ts";
import { applyMode, type Mode, saveMode, storedMode, watchSystemScheme } from "./theme/apply.ts";
import type { Scheme, Tokens } from "./theme/tokens.ts";
import type { Model } from "./types.ts";
import { scrollToSection } from "./views/scroll.ts";
import type { Ctx } from "./viewtypes.ts";

/**
 * Change part of the route. `replace` edits the current history entry (typing, toggles). A new
 * page starts at the top, or at `section` of the home page when one is named.
 */
type Navigate = (patch: Partial<Route>, replace?: boolean, section?: string) => void;

interface Page extends Ctx {
  go: Navigate;
  /** The hash of the current route with `patch` applied, for a link's href. */
  href: (patch: Partial<Route>) => string;
  scheme: Scheme;
  mode: Mode;
  setMode: (mode: Mode) => void;
  showMore: () => void;
}

const PageContext = createContext<Page>();

export const PageProvider = PageContext.Provider;
export function usePage(): Page {
  const page = useContext(PageContext);
  if (!page) throw new Error("usePage needs a PageProvider");
  return page;
}

export function createPage(model: Model): Page {
  // Route ---------------------------------------------------------------------------------
  const routeFromLocation = () => {
    const current = window.location.hash;
    const next = parseHash(current);
    if (isLegacyPath(current)) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${formatHash(next)}`,
      );
    }
    return next;
  };
  const [route, setRoute] = createStore<Route>(routeFromLocation());
  const sync = () => setRoute(reconcile(routeFromLocation()));
  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
  onCleanup(() => {
    window.removeEventListener("hashchange", sync);
    window.removeEventListener("popstate", sync);
  });

  const go: Navigate = (patch, replace = false, section) => {
    const current = unwrap(route);
    // A copy: the store adopts the objects it is given and later changes them in place, so a
    // shared constant such as HOME.view must never reach it.
    const next = structuredClone({ ...current, ...patch });
    const newPage = pagePath(next.view) !== pagePath(current.view);
    const hash = formatHash(next);
    if (hash !== formatHash(current)) {
      const url = hash || `${window.location.pathname}${window.location.search}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      setRoute(reconcile(next));
    }
    // After the new page has drawn, so the browser does not move the scroll to keep content in view.
    if (section) requestAnimationFrame(() => scrollToSection(section));
    else if (newPage) requestAnimationFrame(() => window.scrollTo(0, 0));
  };
  const href = (patch: Partial<Route>) => formatHash({ ...route, ...patch }) || "#";

  // Theme ---------------------------------------------------------------------------------
  const [mode, setModeSignal] = createSignal<Mode>(storedMode());
  const [applied, setApplied] = createSignal(applyMode(mode()));
  createEffect(() => {
    const current = mode();
    setApplied(applyMode(current));
    if (current === "auto") onCleanup(watchSystemScheme(() => setApplied(applyMode("auto"))));
  });
  const setMode = (next: Mode) => {
    saveMode(next);
    setModeSignal(next);
  };

  // Search table: rows shown, back to one step when the search changes -------------------
  const filterKey = createMemo(() => [route.q, route.sort, route.dir].join("|"));
  const [limit, setLimit] = createSignal(PAGE_STEP);
  createEffect(on(filterKey, () => setLimit(PAGE_STEP), { defer: true }));

  return {
    model,
    route,
    go,
    href,
    get tokens(): Tokens {
      return applied().tokens;
    },
    get scheme(): Scheme {
      return applied().scheme;
    },
    get mode(): Mode {
      return mode();
    },
    get limit(): number {
      return limit();
    },
    setMode,
    showMore: () => setLimit(limit() + PAGE_STEP),
  };
}
