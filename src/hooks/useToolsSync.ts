"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { hydrateTools, setLoadState } from "@/stores/slices/toolBuilderSlice";
import type { Tool, ToolNode } from "@/types/tool-builder";

import { useAuth } from "./useAuth";

/** Fetch all tools + their nodes for the signed-in user. */
async function fetchAllTools(): Promise<Tool[]> {
  const supabase = createClient();

  const { data: toolRows, error } = await supabase
    .from("tools")
    .select("id, name, position")
    .order("position");

  if (error) {
    throw error;
  }
  if (!toolRows?.length) {
    return [];
  }

  const toolIds = toolRows.map((t) => t.id);

  const { data: nodeRows, error: nodeError } = await supabase
    .from("tool_nodes")
    .select("id, tool_id, position, type, config")
    .in("tool_id", toolIds)
    .order("position");

  if (nodeError) {
    throw nodeError;
  }

  return toolRows.map((t) => ({
    id: t.id,
    name: t.name,
    nodes: (nodeRows ?? [])
      .filter((n) => n.tool_id === t.id)
      // Spread config (per-type fields) alongside the shared id + type fields.
      .map((n) => ({ id: n.id, type: n.type, ...n.config }) as ToolNode),
  }));
}

/**
 * Persist the current in-memory tools to Supabase.
 *
 * Strategy:
 * 1. Upsert tools (creates new rows, updates existing names/positions).
 * 2. Delete all nodes for these tools, then re-insert fresh — avoids the
 *    deferrable `(tool_id, position)` unique constraint firing mid-update.
 * 3. Fetch current DB tool IDs and delete any no longer in the Redux list.
 */
async function persistTools(tools: Tool[], userId: string): Promise<void> {
  const supabase = createClient();
  const toolIds = tools.map((t) => t.id);

  // 1. Upsert tools — owner_id required by RLS WITH CHECK policy
  if (toolIds.length > 0) {
    const toolRows = tools.map((t, i) => ({
      id: t.id,
      owner_id: userId,
      name: t.name,
      position: i,
    }));
    const { error } = await supabase.from("tools").upsert(toolRows);
    if (error) {
      throw error;
    }
  }

  // 2a. Delete all existing nodes for these tools
  if (toolIds.length > 0) {
    const { error } = await supabase
      .from("tool_nodes")
      .delete()
      .in("tool_id", toolIds);
    if (error) {
      throw error;
    }
  }

  // 2b. Re-insert all nodes
  const nodeRows = tools.flatMap((t) =>
    t.nodes.map((n, i) => {
      const { id, type, ...config } = n as unknown as {
        id: string;
        type: string;
        [key: string]: unknown;
      };
      return { id, tool_id: t.id, position: i, type, config };
    }),
  );
  if (nodeRows.length > 0) {
    const { error } = await supabase.from("tool_nodes").insert(nodeRows);
    if (error) {
      throw error;
    }
  }

  // 3. Delete tools in DB that are no longer in the Redux list
  const { data: dbTools, error: fetchError } = await supabase
    .from("tools")
    .select("id");
  if (fetchError) {
    throw fetchError;
  }
  const orphanIds = (dbTools ?? [])
    .map((t) => t.id)
    .filter((id) => !toolIds.includes(id));
  if (orphanIds.length > 0) {
    const { error } = await supabase.from("tools").delete().in("id", orphanIds);
    if (error) {
      throw error;
    }
  }
}

/** Save state for the manual save action. */
export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Fetches the authenticated user's tools from Supabase and hydrates the
 * Redux Tool Builder slice. Call once at the top of the workspace feature.
 *
 * @returns `saveTools` — persist current Redux state to Supabase.
 * @returns `saveState` — current save operation status.
 */
export function useToolsSync() {
  const { user, loading: authLoading } = useAuth();
  const dispatch = useAppDispatch();
  const tools = useAppSelector((s) => s.toolBuilder.tools);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // Hold a timeout ref so we can clear the "saved" flash if the user saves again quickly.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tools", user?.id],
    queryFn: fetchAllTools,
    enabled: !!user,
  });

  useEffect(() => {
    // Keep "loading" while auth resolves AND while the query runs. The query is
    // disabled until `user` exists, so without `authLoading` the gap between
    // mount and auth-ready would flip to "idle" and flash the empty state
    // before the real fetch begins.
    if (authLoading || isLoading) {
      dispatch(setLoadState("loading"));
    } else if (data) {
      dispatch(hydrateTools(data));
    } else {
      dispatch(setLoadState("idle"));
    }
  }, [authLoading, isLoading, data, dispatch]);

  const saveTools = useCallback(async () => {
    if (saveState === "saving") {
      return;
    }

    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }

    setSaveState("saving");
    try {
      await persistTools(tools, user!.id);
      setSaveState("saved");
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [tools, saveState]);

  return { saveTools, saveState };
}
