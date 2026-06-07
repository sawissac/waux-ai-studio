import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { createNode, uuid } from "@/constants/tool-builder";
import type {
  EditorPlacement,
  Tool,
  ToolNode,
  ToolNodeType,
} from "@/types/tool-builder";

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
}

/** Build the seeded "Newsletter signup" demo tool. */
function seedNewsletter(): Tool {
  return {
    id: "newsletter",
    name: "Newsletter signup",
    nodes: [
      {
        id: "n-state",
        type: "state",
        states: [
          { id: uuid(), name: "email", value: "" },
          { id: uuid(), name: "message", value: "" },
        ],
      },
      {
        id: "n-email",
        type: "text_run_reset",
        fieldLabel: "Email",
        placeholder: "you@example.com",
        buttonText: "Subscribe",
        resetText: "Reset",
        binding: { mode: "name", value: "email" },
      },
      {
        id: "n-code",
        type: "code",
        code: `// runs when an input above triggers
function run(state) {
  const email = state.get("email");
  if (!email) return;
  const log = state.get("message") || "";
  state.set("message", log + "Subscribed: " + email + "\\n");
}`,
      },
      {
        id: "n-message",
        type: "textarea",
        fieldLabel: "Message",
        placeholder: "Write a message…",
        binding: { mode: "name", value: "message" },
      },
    ],
  };
}

const initialState: ToolBuilderState = {
  tools: [seedNewsletter(), { id: "tool-1", name: "Tool name 1", nodes: [] }],
  selectedToolId: "newsletter",
  selectedNodeId: null,
  editorPlacement: "panel",
  search: "",
};

const toolBuilderSlice = createSlice({
  name: "toolBuilder",
  initialState,
  reducers: {
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
  },
});

export const {
  selectTool,
  addTool,
  renameTool,
  deleteTool,
  addNode,
  deleteNode,
  updateNode,
  selectNode,
  clearNodeSelection,
  setEditorPlacement,
  setSearch,
} = toolBuilderSlice.actions;

export const toolBuilderReducer = toolBuilderSlice.reducer;
