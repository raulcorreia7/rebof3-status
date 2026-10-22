// The page state in one place: the route (kept in the URL hash, so every view is a link), the
// theme and how many table rows are shown. Views read it through usePage().

import { createContext, createEffect, createMemo, createSignal, on, onCleanup, useContext } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { PAGE_STEP } from "./model/browse.ts";
import { formatHash, parseHash, type Route } from "./model/route.ts";
import { applyMode, saveMode, storedMode, watchSystemScheme, type Mode } from "./theme/apply.ts";
import type { Scheme, Tokens } from "./theme/tokens.ts";
import type { Model } from "./types.ts";
import type { Ctx } from "./viewtypes.ts";

/** Change part of the route. `replace` edits the current history entry (typing, toggles). */
type Navigate = (patch: Partial<Route>, replace?: boolean) => void;

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
  const [route, setRoute] = createStore<Route>(parseHash(window.location.hash));
  const sync = () => setRoute(reconcile(parseHash(window.location.hash)));
  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
  onCleanup(() => {
    window.removeEventListener("hashchange", sync);
    window.removeEventListener("popstate", sync);
  });

  const go: Navigate = (patch, replace = false) => {
    const current = unwrap(route);
    const next = { ...current, ...patch };
    const hash = formatHash(next);
    if (hash === formatHash(current)) return;
    const url = hash || `${window.location.pathname}${window.location.search}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setRoute(reconcile(next));
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

  // Function table: rows shown, back to one step when a filter changes -------------------
  const filterKey = createMemo(() => [route.q, route.st.join(), route.part, route.lib, route.target, route.group, route.sort, route.dir].join("|"));
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
