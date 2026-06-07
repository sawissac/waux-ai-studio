"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query and report whether it currently matches.
 *
 * SSR-safe: returns `false` on the server and the first client render, then
 * syncs to the real value after mount (so layouts gated on this hook settle on
 * hydration without reading `window` during render).
 *
 * @param query CSS media query, e.g. `"(min-width: 1024px)"`.
 * @returns `true` when the query matches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
