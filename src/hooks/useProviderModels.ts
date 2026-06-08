"use client";

import { useEffect, useState } from "react";

import { fetchOpenRouterModels, MODELS_BY_PROVIDER } from "@/lib/ai-providers";

/**
 * Provider-specific model list. For `openrouter` the live catalogue is
 * fetched once per session (with the curated list as immediate placeholder
 * and as failure fallback). Other providers return their static list.
 */
export function useProviderModels(provider: string): readonly string[] {
  const initial = MODELS_BY_PROVIDER[provider] ?? [];
  const [models, setModels] = useState<readonly string[]>(initial);

  useEffect(() => {
    setModels(MODELS_BY_PROVIDER[provider] ?? []);
    if (provider !== "openrouter") {return;}
    let cancelled = false;
    fetchOpenRouterModels().then((list) => {
      if (!cancelled) {setModels(list);}
    });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  return models;
}
