"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef } from "react";

/**
 * TanStack Query provider. Uses a ref-stable QueryClient so SSR and
 * per-request store patterns don't share a single global instance.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          retry: 1,
        },
      },
    });
  }

  return (
    <QueryClientProvider client={clientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
