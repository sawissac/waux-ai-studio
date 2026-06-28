"use client";

import { useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { selectTool } from "@/stores/slices/toolBuilderSlice";

/** Center view of the builder: the node editor or the chat surface. */
export type BuilderView = "build" | "chat";

/**
 * Search-param keys the builder view state is mirrored to. Kept short so the
 * shared URL stays readable, e.g. `/studio?tool=<id>&tab=chat&left=hidden`.
 */
const PARAM_TOOL = "tool";
const PARAM_TAB = "tab";
const PARAM_LEFT = "left";
const PARAM_RIGHT = "right";

/** Marker value for a collapsed side panel (absence = visible). */
const HIDDEN = "hidden";

/**
 * Returned shape from {@link useBuilderUrlState} — the URL-synced view state
 * plus the setters {@link ToolBuilder} drives.
 */
export interface BuilderUrlState {
  /** Center view (builder vs chat). */
  view: BuilderView;
  /** Whether the left (tools) panel is collapsed. */
  leftHidden: boolean;
  /** Whether the right (palette/inspector) panel is collapsed. */
  rightHidden: boolean;
  /** Collapse/expand the left panel. */
  setLeftHidden: (hidden: boolean) => void;
  /** Collapse/expand the right panel. */
  setRightHidden: (hidden: boolean) => void;
  /** Switch the center view (chat hides both panels; build restores them). */
  handleViewChange: (next: BuilderView) => void;
}

/**
 * Persist the Tool Builder's view state in the URL query string so a reload or
 * a shared link reopens the same tool, builder tab, and panel layout.
 *
 * Owns the center view and side-panel visibility (lifted out of
 * {@link ToolBuilder}); the selected tool lives in the `toolBuilder` slice and
 * is read/dispatched here.
 *
 * The URL is read **once on mount** from `window.location` rather than via
 * `useSearchParams`, so this stays out of the static-prerender Suspense bailout
 * and the initial client render matches the server (defaults below mirror the
 * slice/SSR state, avoiding a hydration mismatch). Writes go through
 * `window.history.replaceState`, the App Router's supported shallow-update path
 * — it syncs the router without a navigation and adds no history entry, so
 * toggling tabs never pollutes the back button.
 *
 * SECURITY: only author-local UI ids/flags are mirrored — never the
 * organization id or any server-only identifier.
 *
 * @returns The persisted view state and the setters {@link ToolBuilder} uses.
 */
export function useBuilderUrlState(): BuilderUrlState {
  const dispatch = useAppDispatch();
  const selectedToolId = useAppSelector((s) => s.toolBuilder.selectedToolId);

  // Defaults mirror the slice/SSR state so the first client render matches the
  // server; the URL is applied in the mount effect below.
  const [view, setView] = useState<BuilderView>("build");
  const [leftHidden, setLeftHidden] = useState(false);
  const [rightHidden, setRightHidden] = useState(false);

  // Gates the write effect until the initial URL read has been applied, so the
  // first read isn't clobbered by a write of the default state.
  const [ready, setReady] = useState(false);
  const didInit = useRef(false);

  // URL -> state, once on mount (client only).
  useEffect(() => {
    if (didInit.current) {
      return;
    }
    didInit.current = true;

    const params = new URLSearchParams(window.location.search);

    const tool = params.get(PARAM_TOOL);
    if (tool) {
      // `selectTool` only sets the id; `hydrateTools` later preserves it when
      // the tool exists in the fetched list, else falls back to the first tool.
      dispatch(selectTool(tool));
    }

    if (params.get(PARAM_TAB) === "chat") {
      setView("chat");
    }

    setLeftHidden(params.get(PARAM_LEFT) === HIDDEN);
    setRightHidden(params.get(PARAM_RIGHT) === HIDDEN);

    setReady(true);
  }, [dispatch]);

  // state -> URL, on every change after the initial read is applied.
  useEffect(() => {
    if (!ready) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (selectedToolId) {
      params.set(PARAM_TOOL, selectedToolId);
    } else {
      params.delete(PARAM_TOOL);
    }

    // Only the chat view is mirrored; "build" (the default) is omitted to keep
    // the URL clean.
    if (view === "chat") {
      params.set(PARAM_TAB, "chat");
    } else {
      params.delete(PARAM_TAB);
    }

    if (leftHidden) {
      params.set(PARAM_LEFT, HIDDEN);
    } else {
      params.delete(PARAM_LEFT);
    }
    if (rightHidden) {
      params.set(PARAM_RIGHT, HIDDEN);
    } else {
      params.delete(PARAM_RIGHT);
    }

    const qs = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [ready, selectedToolId, view, leftHidden, rightHidden]);

  /** Switch center view; chat hides both side panels, build restores them. */
  function handleViewChange(next: BuilderView) {
    setView(next);
    const hide = next === "chat";
    setLeftHidden(hide);
    setRightHidden(hide);
  }

  return {
    view,
    leftHidden,
    rightHidden,
    setLeftHidden,
    setRightHidden,
    handleViewChange,
  };
}
