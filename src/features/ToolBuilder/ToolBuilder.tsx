"use client";

import {
  ResizableGroup,
  ResizableHandle,
  ResizablePanel,
} from "@/components/ui/resizable";
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
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            {loadState === "loading"
              ? "Loading…"
              : "Select or create a tool to start building."}
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
