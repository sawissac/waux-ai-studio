"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";

import { ACCENT_CLASSES, NODE_META } from "@/constants/tool-builder";
import { useTranslation } from "@/hooks/useTranslation";
import { nodeSubtitle } from "@/lib/tool-builder-runtime";
import { cn } from "@/lib/utils";
import type { StateNode, ToolNode } from "@/types/tool-builder";

/**
 * One node in the builder chain.
 *
 * Shows the node's icon, title, and resolved state subtitle. Selecting a card
 * surfaces its editor in the right panel (the editor is never rendered inline).
 *
 * @param props.node - Node to render.
 * @param props.stateNode - Tool state node, for resolving the subtitle.
 * @param props.selected - Whether this node is the active selection.
 * @param props.onSelect - Toggle selection of this node.
 * @param props.onDuplicate - Insert a copy of this node after it in the chain.
 * @param props.onDelete - Remove this node from the chain.
 */
export function NodeCard({
  node,
  stateNode,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  node: ToolNode;
  stateNode: StateNode | null;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const meta = NODE_META[node.type];
  const Icon = meta.icon;
  const subtitle = nodeSubtitle(node, stateNode);

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
    zIndex: isDragging ? 10 : 1,
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
          "nb-press group flex h-14 items-center gap-2.5 border-2 border-foreground bg-card p-2.5 shadow-nb",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          selected && "bg-primary text-primary-foreground",
        )}
      >
        <span
          className={cn(
            "hidden shrink-0 cursor-grab active:cursor-grabbing sm:block",
            selected
              ? "text-primary-foreground/70"
              : "text-muted-foreground/60",
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center border-2 border-foreground",
            ACCENT_CLASSES[meta.accent],
          )}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            @{t(`node.${node.type}.label`)}
          </div>
          {subtitle && (
            <div
              className={cn(
                "flex items-center gap-1 truncate text-[11px]",
                selected
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              <span>{subtitle.label}</span>
              {subtitle.value !== undefined && (
                <span
                  className={cn(
                    "rounded px-1 py-px font-mono text-[10px]",
                    selected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {subtitle.value}
                </span>
              )}
            </div>
          )}
        </div>
        {node.type !== "state" && (
          <button
            type="button"
            aria-label={t("node.duplicate")}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color] duration-(--motion-duration-fast) hover:bg-accent hover:text-foreground group-hover:opacity-100 active:scale-95"
          >
            <Copy size={14} />
          </button>
        )}
        <button
          type="button"
          aria-label={t("node.delete")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color] duration-[var(--motion-duration-fast)] hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 active:scale-95"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
