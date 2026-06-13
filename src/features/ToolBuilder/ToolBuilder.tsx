"use client";

import { MousePointerClick, SlidersHorizontal } from "lucide-react";

import {
  ResizableGroup,
  ResizableHandle,
  ResizablePanel,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { PALETTE_GROUPS } from "@/constants/tool-builder";
import { BuilderPanel } from "@/features/BuilderPanel";
import { NodeEditor } from "@/features/NodeEditor";
import { PalettePanel } from "@/features/PalettePanel";
import { ToolsPanel } from "@/features/ToolsPanel";
import { Topbar } from "@/features/Topbar";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useToolsSync } from "@/hooks/useToolsSync";
import { useAppSelector } from "@/stores/hooks";

/**
 * Tool Builder — top-level feature component.
 *
 * Composes the three-panel workspace: tools list (left), node-chain builder +
 * live preview (center), and the contextual right panel. The right panel shows
 * the node editor when a node is selected in `panel` placement, the
 * "Node" panel when a tool is open, otherwise nothing. All state
 * flows through {@link useToolBuilder};
 * this component holds no local UI state of its own.
 *
 * {@link useToolsSync} hydrates the Redux slice from Supabase on mount.
 */
export function ToolBuilder() {
  // Hydrate tools from Supabase into the Redux slice on mount.
  const { saveTools, saveState } = useToolsSync();

  const { tool, tools, selectedNode, editorPlacement } = useToolBuilder();
  const loadState = useAppSelector((s) => s.toolBuilder.loadState);
  const isLoading = loadState === "loading";

  const showEditorInPanel =
    editorPlacement === "panel" && selectedNode !== null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Topbar
        toolName={tool?.name ?? null}
        toolCount={tools.length}
        onSave={saveTools}
        saveState={saveState}
      />

      <ResizableGroup className="min-h-0 flex-1 flex">
        <ResizablePanel
          id="tools"
          defaultSize="350px"
          minSize="240px"
          maxSize="480px"
          className="min-h-0"
        >
          <aside className="h-full min-h-0">
            {isLoading ? <ToolsSkeleton /> : <ToolsPanel />}
          </aside>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel
          id="builder"
          minSize="320px"
          className="min-h-0 min-w-0"
        >
          <main className="h-full min-h-0 min-w-0">
            {isLoading ? (
              <BuilderSkeleton />
            ) : tool ? (
              <BuilderPanel tool={tool} />
            ) : (
              <EmptyState
                icon={MousePointerClick}
                label="Select or create a tool to start building."
              />
            )}
          </main>
        </ResizablePanel>

        <ResizableHandle />
        <ResizablePanel
          id="inspector"
          defaultSize="400px"
          minSize="300px"
          maxSize="60%"
          className="min-h-0"
        >
          <aside className="h-full min-h-0">
            {isLoading ? (
              <PaletteSkeleton />
            ) : showEditorInPanel && selectedNode ? (
              <div className="h-full overflow-auto p-4">
                <NodeEditor node={selectedNode} placement="panel" />
              </div>
            ) : tool ? (
              <PalettePanel />
            ) : (
              <EmptyState
                icon={SlidersHorizontal}
                label="Inputs appear here once a tool is open."
              />
            )}
          </aside>
        </ResizablePanel>
      </ResizableGroup>
    </div>
  );
}

/**
 * Centered placeholder for an empty pane: a boxed icon above a short label.
 * Used for both the builder canvas and the inspector before a tool is open.
 */
function EmptyState({
  icon: Icon,
  label,
}: {
  icon: typeof MousePointerClick;
  label: string;
}) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
        <span className="grid size-12 place-items-center border-2 border-foreground bg-card shadow-nb">
          <Icon className="size-6" aria-hidden />
        </span>
        <p className="max-w-xs text-sm">{label}</p>
      </div>
    </div>
  );
}

function ToolsSkeleton() {
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
        <span className="text-sm font-bold">Tools</span>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="size-8 border-2 border-foreground shadow-nb-sm" />
          <Skeleton className="size-8 border-2 border-foreground shadow-nb-sm" />
        </div>
      </div>
      <div className="border-b-2 border-foreground px-3 py-2.5">
        <Skeleton className="h-8 w-full border-2 border-foreground" />
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="flex flex-col gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 border-2 border-foreground bg-card px-2.5 py-2"
            >
              <Skeleton className="size-1.5 shrink-0 rounded-full border-0" />
              <Skeleton
                className="h-3 flex-1 border-0"
                style={{ width: `${50 + ((i * 17) % 40)}%` }}
              />
              <Skeleton className="size-7 shrink-0 rounded-md border-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t-2 border-foreground p-3">
        <Skeleton className="h-9 w-full border-2 border-foreground" />
      </div>
    </div>
  );
}

function PaletteSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
        <span className="text-sm font-bold">Node</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="flex flex-col gap-4">
          {PALETTE_GROUPS.map(({ group, types }) => (
            <div key={group} className="flex flex-col gap-1.5">
              <Skeleton className="mx-1 h-2 w-12 border-0" />
              <div className="flex flex-col gap-1.5">
                {types.map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 border-2 border-foreground bg-card p-2.5"
                  >
                    <Skeleton className="size-8 shrink-0 border-2 border-foreground/15" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                      <Skeleton className="h-2.5 w-20 border-0" />
                      <Skeleton className="h-2 w-36 border-0" />
                    </div>
                    <Skeleton className="size-6 shrink-0 rounded-md border-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NodeCardSkeleton() {
  return (
    <div className="flex items-start gap-3 border-2 border-foreground bg-card p-2.5">
      <Skeleton className="size-8 shrink-0 border-2 border-foreground/15" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
        <Skeleton className="h-2.5 w-20 border-0" />
        <Skeleton className="h-2 w-36 border-0" />
      </div>
      <Skeleton className="size-6 shrink-0 rounded-md border-0" />
    </div>
  );
}

function BuilderSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
        <span className="text-sm font-bold">Builder</span>
        <Skeleton className="h-3 w-28 border-0" />
        <div className="ml-auto">
          <Skeleton className="h-7 w-24 border-0" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto flex max-w-2xl flex-col">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              {i > 0 && (
                <span
                  className="mx-auto h-5 w-0 border-l-2 border-foreground"
                  aria-hidden
                />
              )}
              <NodeCardSkeleton />
            </div>
          ))}
          <span
            className="mx-auto h-5 w-0 border-l border-dashed border-border"
            aria-hidden
          />
          <Skeleton className="h-14 border-2 border-dashed border-foreground/40" />
        </div>
      </div>
    </div>
  );
}
