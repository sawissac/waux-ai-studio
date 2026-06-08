"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

/**
 * One node in the builder chain.
 *
 * Shows the node's icon, title, and resolved state subtitle.
 * When selected with `inline` placement, surfaces its editor inline
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

  const showInline = selected && placement === "inline";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : showInline ? 20 : 1,
  };

  return (
    <div className="relative font-display" ref={setNodeRef} style={style}>
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
          "group flex items-center gap-2.5 rounded-xl border border-dashed bg-card p-2.5 h-14 transition-[border-color,box-shadow,transform] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
          "hover:border-foreground/20 active:scale-[0.995]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          selected && "border-foreground/40 ring-2 ring-foreground/10",
        )}
      >
        <span
          className="hidden shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/60 sm:block"
          {...attributes}
          {...listeners}
        >
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
            <div className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <span>{subtitle.label}</span>
              {subtitle.value !== undefined && (
                <span className="rounded bg-muted px-1 py-px font-mono text-[10px]">
                  {subtitle.value}
                </span>
              )}
            </div>
          )}
        </div>
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
    </div>
  );
}
