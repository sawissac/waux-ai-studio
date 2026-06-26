"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Gallery, GalleryTool } from "@/types/gallery";

import { useAuth } from "./useAuth";

/** Thrown by {@link useGallery}'s update when the handle is already claimed. */
export const HANDLE_TAKEN = "HANDLE_TAKEN";
/** Thrown when the handle fails the DB format constraint. */
export const HANDLE_INVALID = "HANDLE_INVALID";

/** Map a `galleries` row to the client {@link Gallery} shape. */
function toGallery(row: {
  handle: string | null;
  title: string | null;
  description: string | null;
  is_public: boolean;
}): Gallery {
  return {
    handle: row.handle,
    title: row.title ?? "",
    description: row.description ?? "",
    isPublic: row.is_public,
  };
}

const GALLERY_COLS = "handle, title, description, is_public";

/**
 * Read the signed-in user's gallery, creating a default (private, no handle)
 * row on first access. Scoped to `owner_id` so the permissive public-read RLS
 * policy can't OR in another user's published gallery.
 */
async function fetchOrCreateGallery(userId: string): Promise<Gallery> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("galleries")
    .select(GALLERY_COLS)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (data) {
    return toGallery(data);
  }

  // No row yet — create the default. On a race (row created concurrently),
  // fall back to re-selecting the owner's row.
  const { data: created, error: insertError } = await supabase
    .from("galleries")
    .insert({ owner_id: userId })
    .select(GALLERY_COLS)
    .single();
  if (insertError) {
    const { data: existing } = await supabase
      .from("galleries")
      .select(GALLERY_COLS)
      .eq("owner_id", userId)
      .maybeSingle();
    if (existing) {
      return toGallery(existing);
    }
    throw insertError;
  }
  return toGallery(created);
}

/**
 * Fetch the owner's tools with their gallery flags. Scoped to `owner_id` so the
 * shared-read RLS policy doesn't leak other users' shared tools into the list.
 */
async function fetchGalleryTools(userId: string): Promise<GalleryTool[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools")
    .select("id, name, icon, in_gallery, is_shared, position")
    .eq("owner_id", userId)
    .order("position");
  if (error) {
    throw error;
  }
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon ?? undefined,
    inGallery: t.in_gallery ?? false,
    isShared: t.is_shared ?? false,
  }));
}

/**
 * Single access point for the signed-in user's gallery: its settings, the
 * owner's tools with their gallery flags, and the bound mutations. Used by the
 * `Gallery` manage page and by the `ToolsPanel` per-tool actions.
 *
 * Gallery flags live OUTSIDE the Tool Builder Redux slice (and its save cycle),
 * which only ever writes `id / name / icon / position` — so these flags are
 * never clobbered by a tool save. Reads/writes go straight to Supabase under
 * RLS and invalidate the relevant query.
 *
 * @returns Gallery settings + tools + flag map + bound mutations and statuses.
 */
export function useGallery() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const galleryQuery = useQuery({
    queryKey: ["gallery", userId],
    queryFn: () => fetchOrCreateGallery(userId!),
    enabled: !!userId,
  });

  const toolsQuery = useQuery({
    queryKey: ["gallery-tools", userId],
    queryFn: () => fetchGalleryTools(userId!),
    enabled: !!userId,
  });

  const galleryTools = useMemo(() => toolsQuery.data ?? [], [toolsQuery.data]);

  /** Per-tool flags keyed by tool id (convenience for the tools list menu). */
  const flagsById = useMemo(() => {
    const map = new Map<string, { inGallery: boolean; isShared: boolean }>();
    for (const t of galleryTools) {
      map.set(t.id, { inGallery: t.inGallery, isShared: t.isShared });
    }
    return map;
  }, [galleryTools]);

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Gallery>) => {
      const supabase = createClient();
      const row: Record<string, unknown> = {};
      if (patch.handle !== undefined) {
        row.handle = patch.handle || null;
      }
      if (patch.title !== undefined) {
        row.title = patch.title;
      }
      if (patch.description !== undefined) {
        row.description = patch.description;
      }
      if (patch.isPublic !== undefined) {
        row.is_public = patch.isPublic;
      }
      const { error } = await supabase
        .from("galleries")
        .update(row)
        .eq("owner_id", userId!);
      if (error) {
        // 23505 unique_violation → handle taken; 23514 check_violation → bad format.
        if (error.code === "23505") {
          throw new Error(HANDLE_TAKEN);
        }
        if (error.code === "23514") {
          throw new Error(HANDLE_INVALID);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery", userId] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async (vars: {
      toolId: string;
      column: "in_gallery" | "is_shared";
      value: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tools")
        .update({ [vars.column]: vars.value })
        .eq("id", vars.toolId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-tools", userId] });
    },
  });

  return {
    /** Current gallery settings, or null until the first fetch resolves. */
    gallery: galleryQuery.data ?? null,
    /** The owner's tools with their gallery flags (gallery-page list). */
    galleryTools,
    /** Per-tool flag lookup keyed by tool id. */
    flagsById,
    /** True while auth or either query is still resolving. */
    isLoading: authLoading || galleryQuery.isLoading || toolsQuery.isLoading,
    /** Update gallery settings. Rejects with HANDLE_TAKEN / HANDLE_INVALID. */
    updateGallery: (patch: Partial<Gallery>) =>
      updateMutation.mutateAsync(patch),
    isUpdating: updateMutation.isPending,
    /** Add/remove a tool from the gallery. */
    setToolInGallery: (toolId: string, value: boolean) =>
      flagMutation.mutateAsync({ toolId, column: "in_gallery", value }),
    /** Make a tool public/private (its share visibility). */
    setToolShared: (toolId: string, value: boolean) =>
      flagMutation.mutateAsync({ toolId, column: "is_shared", value }),
  };
}
