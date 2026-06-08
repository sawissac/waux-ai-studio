"use client";

import { type ReactNode, useRef } from "react";
import { Provider } from "react-redux";

import { type AppStore, makeStore } from "@/stores/store";

/**
 * Client-side Redux provider for the App Router.
 *
 * Builds the store lazily via a ref so exactly one store is created per client
 * render tree (and one per request on the server), avoiding the shared-global
 * store pitfall in RSC. Compose in `src/app/layout.tsx`.
 *
 * @param props.children - App subtree that needs store access.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);

  if (storeRef.current === null) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
