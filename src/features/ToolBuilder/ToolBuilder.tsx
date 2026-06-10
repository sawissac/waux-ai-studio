"use client";

import {
  ResizableGroup,
  ResizableHandle,
  ResizablePanel,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { BuilderPanel } from "@/features/BuilderPanel";
import { NodeEditor } from "@/features/NodeEditor";
import { PalettePanel } from "@/features/PalettePanel";
import { ToolsPanel } from "@/features/ToolsPanel";
import { Topbar } from "@/features/Topbar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useToolsSync } from "@/hooks/useToolsSync";
import { useAppSelector } from "@/stores/hooks";

/**
 * Tool Builder — top-level feature component.
 *
 * Composes the three-panel workspace: tools list (left), node-chain builder +
 * live preview (center), and the contextual right panel. The right panel shows
 * the node editor when a node is selected in `panel` placement, otherwise the
 * "Select Inputs" palette. All state flows through {@link useToolBuilder};
 * this component holds no local UI state of its own.
 *
 * {@link useToolsSync} hydrates the Redux slice from Supabase on mount.
 */
export function ToolBuilder() {
  // Hydrate tools from Supabase into the Redux slice on mount.
  const { saveTools, saveState } = useToolsSync();

  const { tool, tools, selectedNode, editorPlacement } = useToolBuilder();
  const loadState = useAppSelector((s) => s.toolBuilder.loadState);

  /** The inspector pane is mounted only at lg+ (Tailwind `lg` = 1024px). */
  const showInspector = useMediaQuery("(min-width: 1024px)");
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

      {/* Mobile: builder only — side panels collapse away below md. */}
      <main className="min-h-0 min-w-0 flex-1 md:hidden">
        {tool ? (
          <BuilderPanel tool={tool} />
        ) : loadState === "loading" ? (
          <BuilderSkeleton />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Select or create a tool to start building.
          </div>
        )}
      </main>

      {/* md+: resizable three-pane workspace. */}
      <ResizableGroup className="hidden min-h-0 flex-1 md:flex">
        <ResizablePanel
          id="tools"
          defaultSize="350px"
          minSize="240px"
          maxSize="480px"
          className="min-h-0"
        >
          <aside className="h-full min-h-0">
            <ToolsPanel />
          </aside>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel
          id="builder"
          minSize="320px"
          className="min-h-0 min-w-0"
        >
          <main className="h-full min-h-0 min-w-0">
            {tool ? (
              <BuilderPanel tool={tool} />
            ) : loadState === "loading" ? (
              <BuilderSkeleton />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Select or create a tool to start building.
              </div>
            )}
          </main>
        </ResizablePanel>

        {showInspector ? (
          <>
            <ResizableHandle />
            <ResizablePanel
              id="inspector"
              defaultSize="400px"
              minSize="300px"
              maxSize="60%"
              className="min-h-0"
            >
              <aside className="h-full min-h-0">
                {showEditorInPanel && selectedNode ? (
                  <div className="h-full overflow-auto p-4">
                    <NodeEditor node={selectedNode} placement="panel" />
                  </div>
                ) : (
                  <PalettePanel />
                )}
              </aside>
            </ResizablePanel>
          </>
        ) : null}
      </ResizableGroup>
    </div>
  );
}

/** One node-row placeholder, matching the {@link NodeCard} layout. */
function NodeRowSkeleton() {
  return (
    <div className="flex h-14 items-center gap-2.5 border-2 border-foreground bg-card p-2.5 shadow-nb">
      <Skeleton className="size-8 shrink-0 border-2 border-foreground/15" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-24 border-0" />
        <Skeleton className="h-2.5 w-36 border-0" />
      </div>
    </div>
  );
}

/**
 * Placeholder shown in the builder canvas while tools hydrate from Supabase.
 * Mirrors {@link BuilderPanel}: the header bar plus a centered node chain.
 */
function BuilderSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
        <span className="text-sm font-bold">Builder</span>
        <Skeleton className="h-3 w-28 border-0" />
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto flex max-w-2xl flex-col">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              {i > 0 && (
                <span
                  className="mx-auto h-5 w-0 border-l-2 border-foreground"
                  aria-hidden
                />
              )}
              <NodeRowSkeleton />
            </div>
          ))}
          <span
            className="mx-auto h-5 w-0 border-l border-dashed border-border"
            aria-hidden
          />
          <div className="flex h-14 items-center justify-center border-2 border-dashed border-foreground/40">
            <Skeleton className="h-3 w-24 border-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
