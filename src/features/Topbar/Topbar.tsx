"use client";

import { Boxes, Check, CloudUpload, Loader2, LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/AuthLogin";
import type { SaveState } from "@/hooks/useToolsSync";

/**
 * App top bar — wordmark, open-tool breadcrumb, tool count, save action, and sign-out.
 *
 * @param props.toolName - Name of the open tool, shown as a breadcrumb.
 * @param props.toolCount - Total number of tools in the workspace.
 * @param props.onSave - Callback to persist current tools to the database.
 * @param props.saveState - Current save operation status; drives button appearance.
 */
export function Topbar({
  toolName,
  toolCount,
  onSave,
  saveState,
}: {
  toolName: string | null;
  toolCount: number;
  onSave: () => void;
  saveState: SaveState;
}) {
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(() => signOut());
  }

  const isSaving = saveState === "saving";
  const isSaved = saveState === "saved";
  const isError = saveState === "error";

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-6 place-items-center rounded-md bg-foreground font-display text-xs text-background">
          T
        </span>
        Tool Builder
      </div>
      {toolName && (
        <span className="truncate text-sm text-muted-foreground">
          ·&nbsp; <b className="font-semibold text-foreground">{toolName}</b>
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Boxes size={12} /> {toolCount} tools
        </span>

        <Button
          variant="outline"
          size="sm"
          aria-label="Save tools"
          disabled={isSaving}
          onClick={onSave}
          className={[
            "h-7 gap-1.5 px-2.5 text-xs font-medium",
            "transition-[color,border-color,background-color] duration-[--motion-duration-fast]",
            "active:scale-[0.98] transition-transform duration-[--motion-duration-instant]",
            isSaved
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : isError
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {isSaving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : isSaved ? (
            <Check className="size-3" />
          ) : (
            <CloudUpload className="size-3" />
          )}
          {isSaving
            ? "Saving…"
            : isSaved
              ? "Saved"
              : isError
                ? "Error"
                : "Save"}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
          disabled={pending}
          onClick={handleSignOut}
          className="text-muted-foreground transition-transform duration-[--motion-duration-instant] active:scale-[0.98] hover:text-foreground"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}
