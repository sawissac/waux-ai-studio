import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { createNode, uuid } from "@/constants/tool-builder";
import type {
  EditorPlacement,
  Tool,
  ToolNode,
  ToolNodeType,
} from "@/types/tool-builder";

/** Load state for the tools list hydrated from the server. */
export type ToolsLoadState = "idle" | "loading" | "ready";

/**
 * Redux state for the Tool Builder feature.
 *
 * Owns the full tool list plus transient editor UI (which tool/node is
 * selected, how the node editor is surfaced, and the tools-list search query).
 *
 * SECURITY: tools are author-local UI definitions only — never persist or echo
 * any server-only identifier (e.g. an organization id) through this slice.
 */
export interface ToolBuilderState {
  /** All tools in the workspace. */
  tools: Tool[];
  /** Currently open tool, or `null` when none. */
  selectedToolId: string | null;
  /** Currently selected node within the open tool, or `null`. */
  selectedNodeId: string | null;
  /** Where the selected node's editor renders. */
  editorPlacement: EditorPlacement;
  /** Tools-list search query. */
  search: string;
  /** Whether the tools list has been hydrated from the server. */
  loadState: ToolsLoadState;
}

const initialState: ToolBuilderState = {
  tools: [],
  selectedToolId: null,
  selectedNodeId: null,
  editorPlacement: "panel",
  search: "",
  // Start in "loading" so the first client paint shows the skeleton,
  // continuous with the route-level loading.tsx fallback (no empty-state flash).
  loadState: "loading",
};

const toolBuilderSlice = createSlice({
  name: "toolBuilder",
  initialState,
  reducers: {
    /**
     * Replace the tools list with server data. Preserves the current selection
     * when the selected tool still exists; otherwise selects the first tool.
     */
    hydrateTools(state, action: PayloadAction<Tool[]>) {
      state.tools = action.payload;
      state.loadState = "ready";
      if (!action.payload.find((t) => t.id === state.selectedToolId)) {
        state.selectedToolId = action.payload[0]?.id ?? null;
        state.selectedNodeId = null;
      }
    },
    /** Mark tools as loading (prevents empty-state flash before first fetch). */
    setLoadState(state, action: PayloadAction<ToolsLoadState>) {
      state.loadState = action.payload;
    },
    /** Open a tool; clears any node selection. */
    selectTool(state, action: PayloadAction<string>) {
      state.selectedToolId = action.payload;
      state.selectedNodeId = null;
    },
    /** Create a new empty tool, open it, and clear node selection. */
    addTool(state) {
      const n = state.tools.filter((t) =>
        t.name.startsWith("Tool name"),
      ).length;
      const tool: Tool = { id: uuid(), name: `Tool name ${n + 1}`, nodes: [] };
      state.tools.push(tool);
      state.selectedToolId = tool.id;
      state.selectedNodeId = null;
    },
    /** Rename a tool by id. */
    renameTool(state, action: PayloadAction<{ id: string; name: string }>) {
      const tool = state.tools.find((t) => t.id === action.payload.id);
      if (tool) {
        tool.name = action.payload.name;
      }
    },
    /** Delete a tool; reselect a neighbour when the open tool is removed. */
    deleteTool(state, action: PayloadAction<string>) {
      const idx = state.tools.findIndex((t) => t.id === action.payload);
      if (idx === -1) {
        return;
      }
      state.tools.splice(idx, 1);
      if (state.selectedToolId === action.payload) {
        state.selectedToolId = state.tools[Math.max(0, idx - 1)]?.id ?? null;
        state.selectedNodeId = null;
      }
    },
    /** Append a node of `type` to the open tool and select it. */
    addNode(state, action: PayloadAction<ToolNodeType>) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }
      const node = createNode(action.payload);
      tool.nodes.push(node);
      state.selectedNodeId = node.id;
    },
    /** Remove a node from the open tool; clear selection if it was selected. */
    deleteNode(state, action: PayloadAction<string>) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }
      tool.nodes = tool.nodes.filter((n) => n.id !== action.payload);
      if (state.selectedNodeId === action.payload) {
        state.selectedNodeId = null;
      }
    },
    /**
     * Patch a node's config in the open tool. Caller passes the node id plus a
     * partial of that node's fields (type is fixed and never changed here).
     */
    updateNode(
      state,
      action: PayloadAction<{ id: string; changes: Partial<ToolNode> }>,
    ) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      const node = tool?.nodes.find((n) => n.id === action.payload.id);
      if (node) {
        Object.assign(node, action.payload.changes);
      }
    },
    /** Select a node for editing (toggles off when re-selecting the same one). */
    selectNode(state, action: PayloadAction<string>) {
      state.selectedNodeId =
        state.selectedNodeId === action.payload ? null : action.payload;
    },
    /** Rename a state slot and cascade the name change to all bindings that used it. */
    renameStateSlot(
      state,
      action: PayloadAction<{ id: string; oldName: string; newName: string }>,
    ) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }

      const { id, oldName, newName } = action.payload;

      // 1. Update the state node
      const stateNode = tool.nodes.find((n) => n.type === "state");
      if (stateNode?.type === "state") {
        const slot = stateNode.states.find((s) => s.id === id);
        if (slot) {
          slot.name = newName;
        }
      }

      // 2. Cascade rename to all name-based bindings that matched oldName
      if (oldName.trim().length > 0) {
        for (const node of tool.nodes) {
          if ("binding" in node && node.binding) {
            if (
              node.binding.mode === "name" &&
              node.binding.value === oldName
            ) {
              node.binding.value = newName;
            }
          }
        }
      }
    },
    /** Clear node selection — returns the right panel to the palette. */
    clearNodeSelection(state) {
      state.selectedNodeId = null;
    },
    /** Set where the node editor renders. */
    setEditorPlacement(state, action: PayloadAction<EditorPlacement>) {
      state.editorPlacement = action.payload;
    },
    /** Set the tools-list search query. */
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    /** Reorder tools list. */
    reorderTools(
      state,
      action: PayloadAction<{ activeId: string; overId: string }>,
    ) {
      const { activeId, overId } = action.payload;
      if (activeId === overId) {
        return;
      }

      const oldIndex = state.tools.findIndex((t) => t.id === activeId);
      const newIndex = state.tools.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const [removed] = state.tools.splice(oldIndex, 1);
        state.tools.splice(newIndex, 0, removed);
      }
    },
    /** Reorder nodes in the open tool. */
    reorderNodes(
      state,
      action: PayloadAction<{ activeId: string; overId: string }>,
    ) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }

      const { activeId, overId } = action.payload;
      if (activeId === overId) {
        return;
      }

      const oldIndex = tool.nodes.findIndex((n) => n.id === activeId);
      const newIndex = tool.nodes.findIndex((n) => n.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const [removed] = tool.nodes.splice(oldIndex, 1);
        tool.nodes.splice(newIndex, 0, removed);
      }
    },
  },
});

export const {
  hydrateTools,
  setLoadState,
  selectTool,
  addTool,
  renameTool,
  deleteTool,
  addNode,
  deleteNode,
  updateNode,
  selectNode,
  renameStateSlot,
  clearNodeSelection,
  setEditorPlacement,
  setSearch,
  reorderTools,
  reorderNodes,
} = toolBuilderSlice.actions;

export const toolBuilderReducer = toolBuilderSlice.reducer;
