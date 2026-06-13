"use client";

import { RotateCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered when a child throws. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional side-effect on catch (logging, telemetry). */
  onError?: (error: Error, info: ErrorInfo) => void;
  /**
   * When any value in this array changes, the boundary auto-resets. Pass props
   * the subtree depends on so recovery is automatic once inputs change.
   */
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-phase errors in its subtree so one broken widget can't take
 * down the whole app. (Does NOT catch async / event-handler / rAF errors —
 * those need a global handler; see {@link installGlobalErrorSwallow}.)
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (!this.state.error) {
      return;
    }
    const a = prev.resetKeys;
    const b = this.props.resetKeys;
    if (a && b && (a.length !== b.length || a.some((v, i) => v !== b[i]))) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
        <span>Something went wrong rendering this view.</span>
        <button
          type="button"
          onClick={this.reset}
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-medium hover:bg-accent"
        >
          <RotateCw size={12} /> Retry
        </button>
      </div>
    );
  }
}

/** Substrings of known-benign async errors we never want to crash the app. */
const SWALLOWED_PATTERNS = [
  // Monaco schedules renders in a rAF; if its host DOM is reparented/removed by
  // a list reorder before that fires, it throws reading `domNode`. Cosmetic —
  // the editor recovers on next layout. Swallow so it doesn't reach overlays.
  "domNode",
  "Cannot read properties of undefined (reading 'domNode')",
];

function isSwallowable(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return SWALLOWED_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Installs window-level handlers that swallow known-benign async errors (e.g.
 * Monaco's reorder rAF race) which Error Boundaries cannot catch. Returns a
 * cleanup function. Anything not matched is left to propagate normally.
 */
export function installGlobalErrorSwallow(): () => void {
  const isDev = process.env.NODE_ENV !== "production";
  const onError = (e: ErrorEvent) => {
    if (isSwallowable(e.error ?? e.message)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isDev) {
        console.warn("[swallowed] benign editor error:", e.error ?? e.message);
      }
    }
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    if (isSwallowable(e.reason)) {
      e.preventDefault();
      if (isDev) {
        console.warn("[swallowed] benign editor rejection:", e.reason);
      }
    }
  };
  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onRejection, true);
  return () => {
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onRejection, true);
  };
}

/** Mount once near the app root to activate {@link installGlobalErrorSwallow}. */
export function GlobalErrorSwallow() {
  useEffect(() => installGlobalErrorSwallow(), []);
  return null;
}
