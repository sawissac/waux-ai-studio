"use client";

import { Boxes, FlaskConical, Plus } from "lucide-react";

import { NodeCard } from "@/features/NodeCard";
import { PreviewPane } from "@/features/PreviewPane";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { cn } from "@/lib/utils";
import type { EditorPlacement, Tool } from "@/types/tool-builder";

const PLACEMENTS: EditorPlacement[] = ["panel", "inline", "popover"];

/**
 * Center panel — the node chain plus the live preview.
 *
 * Renders each node as a {@link NodeCard} (connected top-to-bottom), an
 * "Add input" affordance that returns focus to the palette, and the
 * {@link PreviewPane}. Empty tools show guidance instead of a chain. A
 * segmented control switches the global editor placement.
 *
 * @param props.tool - The open tool to build.
 */
export function BuilderPanel({ tool }: { tool: Tool }) {
  const {
    stateNode,
    selectedNodeId,
    editorPlacement,
    selectNode,
    deleteNode,
    clearNodeSelection,
    setEditorPlacement,
  } = useToolBuilder();

  const empty = tool.nodes.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-semibold">Builder</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {tool.name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center rounded-md border p-0.5 text-[11px] sm:flex">
            {PLACEMENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setEditorPlacement(p)}
                className={cn(
                  "rounded px-2 py-1 capitalize transition-colors duration-[var(--motion-duration-fast)]",
                  editorPlacement === p
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Boxes size={12} /> {tool.nodes.length} nodes
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          {empty ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                <FlaskConical size={22} />
              </span>
              <div className="text-sm font-semibold">This tool is empty</div>
              <div className="max-w-xs text-xs text-muted-foreground">
                Add nodes from the <b>Select Inputs</b> panel. Start with a
                State Control.
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {tool.nodes.map((node, i) => (
                <div key={node.id} className="flex flex-col">
                  {i > 0 && (
                    <span className="mx-auto h-5 w-px bg-border" aria-hidden />
                  )}
                  <NodeCard
                    node={node}
                    stateNode={stateNode}
                    selected={node.id === selectedNodeId}
                    placement={editorPlacement}
                    onSelect={() => selectNode(node.id)}
                    onDelete={() => deleteNode(node.id)}
                  />
                </div>
              ))}
              <span className="mx-auto h-5 w-px bg-border" aria-hidden />
              <button
                type="button"
                onClick={clearNodeSelection}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:border-foreground/30 hover:text-foreground active:scale-[0.99]"
              >
                <Plus size={15} /> Add input
              </button>
            </div>
          )}

          <PreviewPane tool={tool} stateNode={stateNode} />
        </div>
      </div>
    </div>
  );
}
