"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FlaskConical, Plus } from "lucide-react";
import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NodeCard } from "@/features/NodeCard";
import { NODE_DND_MIME } from "@/features/PalettePanel";
import { PreviewPane } from "@/features/PreviewPane";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { EditorPlacement, Tool, ToolNodeType } from "@/types/tool-builder";

const PLACEMENTS: EditorPlacement[] = ["panel", "inline"];

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
    addNode,
    selectNode,
    deleteNode,
    clearNodeSelection,
    setEditorPlacement,
    reorderNodes,
  } = useToolBuilder();
  const { t } = useTranslation();

  const [dropActive, setDropActive] = useState(false);

  /** Accept a node-type drag originating from the palette. */
  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(NODE_DND_MIME)) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  }

  function handleDrop(e: React.DragEvent) {
    const type = e.dataTransfer.getData(NODE_DND_MIME);
    setDropActive(false);
    if (!type) {
      return;
    }
    e.preventDefault();
    addNode(type as ToolNodeType);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderNodes(active.id as string, over.id as string);
    }
  }

  const empty = tool.nodes.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
        <span className="text-sm font-bold">{t("builder.title")}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {tool.name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Tabs
            value={editorPlacement}
            onValueChange={(val) => setEditorPlacement(val as EditorPlacement)}
            className="hidden sm:block"
          >
            <TabsList className="h-7">
              {PLACEMENTS.map((p) => (
                <TabsTrigger
                  key={p}
                  value={p}
                  className="text-[11px] capitalize"
                >
                  {t(`builder.placement.${p}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto p-4 sm:p-6"
        onDragOver={handleDragOver}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleDrop}
      >
        <div className="mx-auto max-w-2xl">
          {empty ? (
            <div
              className={cn(
                "flex flex-col items-center gap-2 border-2 border-dashed border-foreground py-14 text-center transition-colors duration-(--motion-duration-fast)",
                dropActive && "border-primary bg-accent",
              )}
            >
              <span className="grid size-11 place-items-center border-2 border-foreground bg-primary text-primary-foreground shadow-nb-sm">
                <FlaskConical size={22} />
              </span>
              <div className="text-sm font-bold">{t("builder.emptyTitle")}</div>
              <div className="max-w-xs text-xs text-muted-foreground">
                {t("builder.emptyBody")}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <DndContext
                id="builder-dnd"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tool.nodes.map((n) => n.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tool.nodes.map((node, i) => (
                    <div key={node.id} className="flex flex-col">
                      {i > 0 && (
                        <span
                          className="mx-auto h-5 w-0 border-l-2 border-foreground"
                          aria-hidden
                        />
                      )}
                      <NodeCard
                        node={node}
                        orderIndex={i}
                        stateNode={stateNode}
                        selected={node.id === selectedNodeId}
                        placement={editorPlacement}
                        onSelect={() => selectNode(node.id)}
                        onDelete={() => deleteNode(node.id)}
                      />
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
              <span
                className="mx-auto h-5 w-0 border-l border-dashed border-border"
                aria-hidden
              />
              <button
                type="button"
                onClick={clearNodeSelection}
                className={cn(
                  "inline-flex h-14 items-center justify-center gap-1.5 border-2 border-dashed border-foreground text-sm font-bold text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-accent hover:text-foreground",
                  dropActive && "border-primary bg-accent text-foreground",
                )}
              >
                <Plus size={15} />{" "}
                {dropActive ? t("builder.dropToAdd") : t("builder.addInput")}
              </button>
            </div>
          )}

          <PreviewPane tool={tool} stateNode={stateNode} />
        </div>
      </div>
    </div>
  );
}
