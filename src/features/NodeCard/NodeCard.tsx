"use client";

import { GripVertical, Trash2 } from "lucide-react";

import { ACCENT_CLASSES, NODE_META } from "@/constants/tool-builder";
import { NodeEditor } from "@/features/NodeEditor";
import { nodeSubtitle } from "@/lib/tool-builder-runtime";
import { cn } from "@/lib/utils";
import type {
  EditorPlacement,
  StateNode,
  ToolNode,
} from "@/types/tool-builder";
import { RENDER_NODE_TYPES } from "@/types/tool-builder";

/**
 * One node in the builder chain.
 *
 * Shows the node's icon, title, resolved state subtitle and a "renders" tag
 * for output nodes. When selected, surfaces its editor inline or in a popover
 * (the `panel` placement is rendered by the right panel instead).
 *
 * @param props.node - Node to render.
 * @param props.stateNode - Tool state node, for resolving the subtitle.
 * @param props.selected - Whether this node is the active selection.
 * @param props.placement - Active editor placement mode.
 * @param props.onSelect - Toggle selection of this node.
 * @param props.onDelete - Remove this node from the chain.
 */
export function NodeCard({
  node,
  stateNode,
  selected,
  placement,
  onSelect,
  onDelete,
}: {
  node: ToolNode;
  stateNode: StateNode | null;
  selected: boolean;
  placement: EditorPlacement;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = meta.icon;
  const subtitle = nodeSubtitle(node, stateNode);
  const renders = RENDER_NODE_TYPES.has(node.type);

  const showInline = selected && placement === "inline";
  const showPopover = selected && placement === "popover";

  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "group flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-sm transition-[border-color,box-shadow,transform] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
          "cursor-pointer hover:border-foreground/20 active:scale-[0.995]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          selected && "border-foreground/40 ring-2 ring-foreground/10",
        )}
      >
        <span className="hidden shrink-0 cursor-grab text-muted-foreground/60 sm:block">
          <GripVertical size={14} />
        </span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            ACCENT_CLASSES[meta.accent],
          )}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">@{meta.label}</div>
          {subtitle && (
            <div className="truncate font-mono text-[11px] text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
        {renders && (
          <span className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            renders
          </span>
        )}
        <button
          type="button"
          aria-label="Delete node"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color] duration-[var(--motion-duration-fast)] hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 active:scale-95"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {showInline && (
        <div className="mt-2 rounded-xl border bg-card p-3 shadow-sm duration-[var(--motion-duration-base)] animate-in fade-in slide-in-from-top-1">
          <NodeEditor node={node} placement="inline" />
        </div>
      )}

      {showPopover && (
        <div className="absolute left-1/2 top-[calc(100%+10px)] z-20 w-[360px] max-w-[88vw] -translate-x-1/2 duration-[var(--motion-duration-base)] animate-in fade-in zoom-in-95 slide-in-from-top-1">
          <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l border-t bg-card" />
          <div className="relative max-h-[60vh] overflow-auto rounded-xl border bg-card p-3 shadow-xl">
            <NodeEditor node={node} placement="popover" />
          </div>
        </div>
      )}
    </div>
  );
}
