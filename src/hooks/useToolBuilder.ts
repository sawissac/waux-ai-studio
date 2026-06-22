"use client";

import { useMemo } from "react";

import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addNode,
  addStateSlot,
  addTool,
  applyBuildSpec,
  clearNodeSelection,
  deleteNode,
  deleteTool,
  renameStateSlot,
  renameTool,
  reorderNodes,
  reorderTools,
  selectNode,
  selectTool,
  setEditorPlacement,
  setSearch,
  updateNode,
} from "@/stores/slices/toolBuilderSlice";
import type {
  BuildSpec,
  EditorPlacement,
  StateNode,
  Tool,
  ToolNode,
  ToolNodeType,
} from "@/types/tool-builder";

/**
 * Single access point for Tool Builder state + actions.
 *
 * Components never touch the slice or `useAppSelector` directly (per the
 * feature rules); they read derived values and call the bound action helpers
 * returned here. Selectors are memoised so unrelated slice changes don't
 * re-render every consumer.
 *
 * @returns Derived state (open tool, selected node, etc.) and bound actions.
 */
export function useToolBuilder() {
  const dispatch = useAppDispatch();

  const tools = useAppSelector((s) => s.toolBuilder.tools);
  const selectedToolId = useAppSelector((s) => s.toolBuilder.selectedToolId);
  const selectedNodeId = useAppSelector((s) => s.toolBuilder.selectedNodeId);
  const editorPlacement = useAppSelector((s) => s.toolBuilder.editorPlacement);
  const search = useAppSelector((s) => s.toolBuilder.search);

  const tool: Tool | null = useMemo(
    () => tools.find((t) => t.id === selectedToolId) ?? null,
    [tools, selectedToolId],
  );

  const selectedNode: ToolNode | null = useMemo(
    () => tool?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [tool, selectedNodeId],
  );

  /** First state node in the open tool — the source of bindable state slots. */
  const stateNode: StateNode | null = useMemo(
    () => (tool?.nodes.find((n) => n.type === "state") as StateNode) ?? null,
    [tool],
  );

  const filteredTools: Tool[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tools.filter((t) => t.name.toLowerCase().includes(q)) : tools;
  }, [tools, search]);

  return {
    // state
    tools,
    filteredTools,
    tool,
    selectedToolId,
    selectedNode,
    selectedNodeId,
    stateNode,
    editorPlacement,
    search,
    // actions
    selectTool: (id: string) => dispatch(selectTool(id)),
    addTool: () => dispatch(addTool()),
    renameTool: (id: string, name: string) =>
      dispatch(renameTool({ id, name })),
    deleteTool: (id: string) => dispatch(deleteTool(id)),
    addNode: (type: ToolNodeType) => dispatch(addNode(type)),
    deleteNode: (id: string) => dispatch(deleteNode(id)),
    updateNode: (id: string, changes: Partial<ToolNode>) =>
      dispatch(updateNode({ id, changes })),
    selectNode: (id: string) => dispatch(selectNode(id)),
    renameStateSlot: (id: string, oldName: string, newName: string) =>
      dispatch(renameStateSlot({ id, oldName, newName })),
    addStateSlot: (name: string, value?: string) =>
      dispatch(addStateSlot({ name, value })),
    applyBuildSpec: (spec: BuildSpec) => dispatch(applyBuildSpec(spec)),
    clearNodeSelection: () => dispatch(clearNodeSelection()),
    setEditorPlacement: (p: EditorPlacement) => dispatch(setEditorPlacement(p)),
    setSearch: (q: string) => dispatch(setSearch(q)),
    reorderTools: (activeId: string, overId: string) =>
      dispatch(reorderTools({ activeId, overId })),
    reorderNodes: (activeId: string, overId: string) =>
      dispatch(reorderNodes({ activeId, overId })),
  };
}
