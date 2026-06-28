import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { createNode, uuid } from "@/constants/tool-builder";
import type {
  BuildSpec,
  StateNode,
  Tool,
  ToolNode,
  ToolNodeType,
} from "@/types/tool-builder";

/**
 * Recursively assign a fresh `id` to every object sitting inside an array that
 * lacks one. The chat assistant emits node config without ids (options, rules,
 * map fields, sprite animations, vault entries, …), so this restores the stable
 * keys the editor and renderers rely on. Objects already carrying an `id` and
 * non-object array items (e.g. string targets) are left untouched.
 *
 * @param value - Any config value to walk in place.
 */
function ensureIds(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.id !== "string" || !obj.id) {
          obj.id = uuid();
        }
      }
      ensureIds(item);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      ensureIds(v);
    }
  }
}

/**
 * Collect every name-mode state slot a node config references, walking nested
 * objects/arrays (sprite animations, etc.). A binding is any object shaped
 * `{ mode: "name", value: "slot" }` with a non-blank value.
 *
 * @param value - Any config value to walk.
 * @param out - Accumulator the found slot names are added to.
 */
function collectBoundSlots(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectBoundSlots(item, out);
    }
    return;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (
      obj.mode === "name" &&
      typeof obj.value === "string" &&
      obj.value.trim()
    ) {
      out.add(obj.value.trim());
    }
    for (const v of Object.values(obj)) {
      collectBoundSlots(v, out);
    }
  }
}

/**
 * Regenerate the ids of every nested array-item object in a config (in place),
 * mirroring {@link ensureIds}' traversal but FORCING a fresh id where one
 * already exists. Used when duplicating a node/tool so the copy's inner items
 * (select options, vault entries, scrape selectors, sprite animations, …) get
 * their own ids instead of sharing the original's. The walked value's own
 * top-level `id` is a plain string property (not an array item), so it is left
 * untouched — callers set the node/tool id explicitly.
 *
 * @param value - Any config value to walk in place.
 */
function regenNestedIds(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.id === "string") {
          obj.id = uuid();
        }
      }
      regenNestedIds(item);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      regenNestedIds(v);
    }
  }
}

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
  /** Tools-list search query. */
  search: string;
  /** Whether the tools list has been hydrated from the server. */
  loadState: ToolsLoadState;
}

const initialState: ToolBuilderState = {
  tools: [],
  selectedToolId: null,
  selectedNodeId: null,
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
    /**
     * Set (or clear) a tool's sidebar icon. The payload's `icon` should already
     * be sanitised SVG markup; an empty string clears the icon (UI falls back
     * to the default glyph).
     */
    setToolIcon(state, action: PayloadAction<{ id: string; icon: string }>) {
      const tool = state.tools.find((t) => t.id === action.payload.id);
      if (tool) {
        tool.icon = action.payload.icon || undefined;
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
    /**
     * Duplicate a tool, inserting the copy right after the original and opening
     * it. Every node gets a fresh id, nested item ids are regenerated, and run
     * `targets`/`resetTargets` are remapped to the cloned node ids so the copy's
     * Buttons/Text run the copy's chain — not the source tool's nodes.
     */
    duplicateTool(state, action: PayloadAction<string>) {
      const idx = state.tools.findIndex((t) => t.id === action.payload);
      if (idx === -1) {
        return;
      }
      const src = state.tools[idx];
      const clone: Tool = structuredClone(src);
      clone.id = uuid();
      clone.name = `${src.name} copy`;

      // Fresh node ids, keyed old → new so run targets can be remapped below.
      const idMap = new Map<string, string>();
      for (const node of clone.nodes) {
        const newId = uuid();
        idMap.set(node.id, newId);
        node.id = newId;
      }
      for (const node of clone.nodes) {
        regenNestedIds(node);
        const rec = node as unknown as Record<string, unknown>;
        for (const key of ["targets", "resetTargets"] as const) {
          const arr = rec[key];
          if (Array.isArray(arr)) {
            rec[key] = arr.map((id) =>
              typeof id === "string" ? (idMap.get(id) ?? id) : id,
            );
          }
        }
      }

      state.tools.splice(idx + 1, 0, clone);
      state.selectedToolId = clone.id;
      state.selectedNodeId = null;
    },
    /**
     * Append a node of `type` to the open tool and select it. A tool has at
     * most one State Control: adding a second `state` node instead selects the
     * existing one (slots are managed there), keeping the shared store single.
     */
    addNode(state, action: PayloadAction<ToolNodeType>) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }
      if (action.payload === "state") {
        const existing = tool.nodes.find((n) => n.type === "state");
        if (existing) {
          state.selectedNodeId = existing.id;
          return;
        }
      }
      const node = createNode(action.payload);
      tool.nodes.push(node);
      state.selectedNodeId = node.id;
    },
    /**
     * Insert a node of `type` into the open tool at `index` (clamped to the
     * chain bounds) and select it — the precise-placement counterpart to
     * {@link addNode} (which always appends). Used by the builder canvas' inline
     * gap inserters so authors drop a node exactly where they want it instead of
     * appending then dragging it up.
     *
     * Mirrors `addNode`'s single-State-Control rule: requesting a second `state`
     * node instead selects the existing one (slots are managed there), ignoring
     * the index, so the shared store stays single.
     */
    insertNode(
      state,
      action: PayloadAction<{ type: ToolNodeType; index: number }>,
    ) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }
      const { type, index } = action.payload;
      if (type === "state") {
        const existing = tool.nodes.find((n) => n.type === "state");
        if (existing) {
          state.selectedNodeId = existing.id;
          return;
        }
      }
      const node = createNode(type);
      const at = Math.max(0, Math.min(index, tool.nodes.length));
      tool.nodes.splice(at, 0, node);
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
     * Duplicate a node in the open tool, inserting the copy right after the
     * original and selecting it. The copy gets a fresh id and regenerated nested
     * item ids; any run `targets`/`resetTargets` are kept as-is (the duplicate
     * runs the same existing chain). The single State Control is never
     * duplicated — a tool has at most one.
     */
    duplicateNode(state, action: PayloadAction<string>) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }
      const idx = tool.nodes.findIndex((n) => n.id === action.payload);
      if (idx === -1) {
        return;
      }
      const src = tool.nodes[idx];
      if (src.type === "state") {
        return;
      }
      const clone = structuredClone(src);
      clone.id = uuid();
      regenNestedIds(clone);
      tool.nodes.splice(idx + 1, 0, clone);
      state.selectedNodeId = clone.id;
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
    /**
     * Add a shared-state slot to the open tool's State Control, creating that
     * node (at the front of the chain) when the tool has none yet. No-ops on a
     * blank or duplicate name. Used by the chat assistant's build tools.
     */
    addStateSlot(
      state,
      action: PayloadAction<{ name: string; value?: string }>,
    ) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }
      const name = action.payload.name.trim();
      if (!name) {
        return;
      }
      let stateNode = tool.nodes.find((n) => n.type === "state");
      if (!stateNode) {
        stateNode = { id: uuid(), type: "state", states: [] };
        tool.nodes.unshift(stateNode);
      }
      if (stateNode.type !== "state") {
        return;
      }
      if (stateNode.states.some((s) => s.name === name)) {
        return;
      }
      stateNode.states.push({
        id: uuid(),
        name,
        value: action.payload.value ?? "",
      });
    },
    /**
     * Rebuild the open tool's whole node chain from a chat-assistant build spec
     * in ONE atomic dispatch (one re-render). Replaces every node with a fresh
     * State Control built from `slots` followed by each spec node — created from
     * its type's defaults, patched with the supplied config, and given fresh ids
     * throughout. The spec is the resulting state, so this both creates and edits
     * (the assistant always emits the complete desired tool). A `state` node in
     * `nodes` is ignored — slots are the only source of the State Control.
     */
    applyBuildSpec(state, action: PayloadAction<BuildSpec>) {
      const tool = state.tools.find((t) => t.id === state.selectedToolId);
      if (!tool) {
        return;
      }
      const { name, slots, nodes } = action.payload;
      const next: ToolNode[] = [];

      // State Control first, built from the spec's slots (deduped by name).
      const seen = new Set<string>();
      const stateNode: StateNode = { id: uuid(), type: "state", states: [] };
      for (const slot of slots) {
        const slotName = slot.name?.trim();
        if (!slotName || seen.has(slotName)) {
          continue;
        }
        seen.add(slotName);
        stateNode.states.push({
          id: uuid(),
          name: slotName,
          value: slot.value ?? "",
        });
      }
      next.push(stateNode);

      // Built nodes in spec order (State Control excluded) + their generated id
      // keyed by the model's local `ref`, so run targets can be resolved below.
      const built: ToolNode[] = [];
      const refToId = new Map<string, string>();
      for (const spec of nodes) {
        if (!spec?.type || spec.type === "state") {
          continue;
        }
        const node = createNode(spec.type);
        if (spec.config) {
          Object.assign(node, spec.config);
        }
        // Force the id back to a fresh value after the merge (the config patch
        // is already stripped of id/type, but stay defensive).
        node.id = uuid();
        ensureIds(node);
        if (spec.ref) {
          refToId.set(spec.ref, node.id);
        }
        built.push(node);
        next.push(node);
      }

      // Resolve run targets: the model addresses a target node by the `ref` it
      // assigned, or by its 1-based position in the spec's `nodes` array. Map
      // each to the node's generated id; drop anything that resolves to nothing
      // (leaving targets empty = run the whole chain).
      const resolveTarget = (t: unknown): string | null => {
        if (typeof t === "string") {
          if (refToId.has(t)) {
            return refToId.get(t) ?? null;
          }
          const n = Number(t);
          return Number.isInteger(n) ? (built[n - 1]?.id ?? null) : null;
        }
        if (typeof t === "number") {
          return built[t - 1]?.id ?? null;
        }
        return null;
      };
      for (const node of built) {
        const rec = node as unknown as Record<string, unknown>;
        for (const key of ["targets", "resetTargets"] as const) {
          const arr = rec[key];
          if (Array.isArray(arr)) {
            rec[key] = arr
              .map(resolveTarget)
              .filter((id): id is string => id !== null);
          }
        }
      }

      // Safety net: auto-create any slot a node binds to that the spec forgot to
      // declare, so a node never wires to a non-existent slot (a dead wire).
      const bound = new Set<string>();
      for (const node of next) {
        if (node.type !== "state") {
          collectBoundSlots(node, bound);
        }
      }
      for (const slotName of bound) {
        if (!seen.has(slotName)) {
          seen.add(slotName);
          stateNode.states.push({ id: uuid(), name: slotName, value: "" });
        }
      }

      tool.nodes = next;
      if (name?.trim()) {
        tool.name = name.trim();
      }
      state.selectedNodeId = null;
    },
    /** Clear node selection — returns the right panel to the palette. */
    clearNodeSelection(state) {
      state.selectedNodeId = null;
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
  setToolIcon,
  deleteTool,
  duplicateTool,
  addNode,
  insertNode,
  deleteNode,
  duplicateNode,
  updateNode,
  selectNode,
  renameStateSlot,
  addStateSlot,
  applyBuildSpec,
  clearNodeSelection,
  setSearch,
  reorderTools,
  reorderNodes,
} = toolBuilderSlice.actions;

export const toolBuilderReducer = toolBuilderSlice.reducer;
