"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query and report whether it currently matches.
 *
 * Backed by `useSyncExternalStore` so the *first* client render already reflects
 * the real `matchMedia` result — there is no post-mount sync, so layouts gated
 * on this hook never flash/shift between the initial paint and hydration. On the
 * server (and during hydration) it falls back to `defaultMatches`.
 *
 * @param query CSS media query, e.g. `"(min-width: 1024px)"`.
 * @param defaultMatches Value used for the server snapshot (no `window`).
 * @returns `true` when the query matches.
 */
export function useMediaQuery(query: string, defaultMatches = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => defaultMatches,
  );
}
