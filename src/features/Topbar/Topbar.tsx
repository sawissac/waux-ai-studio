"use client";

import { Boxes } from "lucide-react";

/**
 * App top bar — wordmark, the open tool breadcrumb, and the tool count.
 *
 * @param props.toolName - Name of the open tool, shown as a breadcrumb.
 * @param props.toolCount - Total number of tools in the workspace.
 */
export function Topbar({
  toolName,
  toolCount,
}: {
  toolName: string | null;
  toolCount: number;
}) {
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
      <span className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Boxes size={12} /> {toolCount} tools
      </span>
    </div>
  );
}
