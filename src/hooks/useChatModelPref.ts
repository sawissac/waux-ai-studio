"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { AiProvider } from "@/types/tool-builder";

import { useAuth } from "./useAuth";

/** The user's global Builder-chat model selection (shared across all tools). */
export interface ChatModelPref {
  provider: AiProvider;
  /** Selected model id, or null to use the app default for the provider. */
  model: string | null;
}

const QUERY_KEY = ["chat-model-pref"] as const;
const FALLBACK: ChatModelPref = { provider: "gemini", model: null };

/** Read `profiles.chat_provider` / `chat_model` for the signed-in user. */
async function fetchPref(): Promise<ChatModelPref> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return FALLBACK;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("chat_provider, chat_model")
    .eq("id", user.id)
    .single();
  if (error) {
    throw error;
  }
  return {
    provider: (data?.chat_provider as AiProvider) ?? "gemini",
    model: data?.chat_model ?? null,
  };
}

/** Write the selection back to `profiles` for the signed-in user. */
async function savePref(next: ChatModelPref): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  const { error } = await supabase
    .from("profiles")
    .update({ chat_provider: next.provider, chat_model: next.model })
    .eq("id", user.id);
  if (error) {
    throw error;
  }
}

/**
 * Global Builder-chat model selection, persisted on the user's `profiles` row
 * (one choice across every tool). Reads once via TanStack Query; `save` writes
 * to Supabase and updates the cache optimistically so the picker reacts
 * instantly. Falls back to `gemini` / app-default model until loaded.
 */
export function useChatModelPref() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPref,
    enabled: Boolean(user),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: savePref,
    onMutate: (next) => {
      qc.setQueryData(QUERY_KEY, next);
    },
  });

  return {
    provider: query.data?.provider ?? FALLBACK.provider,
    model: query.data?.model ?? FALLBACK.model,
    loading: query.isLoading,
    /** Persist a new selection (optimistic). Fire-and-forget. */
    save: (next: ChatModelPref) => mutation.mutate(next),
  };
}
