/**
 * Domain types for the Tool Builder feature.
 *
 * A {@link Tool} is an ordered chain of {@link ToolNode}s that runs
 * top-to-bottom. Nodes share a flat key/value store defined by the single
 * {@link StateNode}; input nodes read/write it, code nodes transform it, and
 * render nodes surface it in the live preview.
 */

/** Icon/colour accent applied to a node type across the UI. */
export type NodeAccent = "violet" | "blue" | "amber" | "emerald";

/** Discriminator for every node kind the builder supports. */
export type ToolNodeType =
  | "state"
  | "text_run_reset"
  | "text_run"
  | "textarea"
  | "code"
  | "canvas";

/** A single named slot in the shared state store. */
export interface StateEntry {
  /** Stable id for list keying. */
  id: string;
  /** Key other nodes bind to by name. */
  name: string;
  /** Default/seed value for the preview runtime. */
  value: string;
}

/** How a node resolves which state slot it reads from / writes to. */
export type BindingMode = "name" | "index";

/** A node's pointer into the shared state store. */
export interface StateBinding {
  /** Resolve by state `name` or by positional `index`. */
  mode: BindingMode;
  /** State name (mode `name`) or stringified index (mode `index`). */
  value: string;
}

interface BaseNode {
  /** Unique node id within its tool. */
  id: string;
  type: ToolNodeType;
}

/** Defines & owns the shared state slots for a tool. Does not render. */
export interface StateNode extends BaseNode {
  type: "state";
  states: StateEntry[];
}

/** Single-line field that triggers a run, then clears itself. */
export interface TextRunResetNode extends BaseNode {
  type: "text_run_reset";
  fieldLabel: string;
  placeholder: string;
  buttonText: string;
  resetText: string;
  binding: StateBinding;
}

/** Single-line field that triggers a run and keeps its value. */
export interface TextRunNode extends BaseNode {
  type: "text_run";
  fieldLabel: string;
  placeholder: string;
  buttonText: string;
  binding: StateBinding;
}

/** Multi-line, two-way bound text field (e.g. a message body). */
export interface TextareaNode extends BaseNode {
  type: "textarea";
  fieldLabel: string;
  placeholder: string;
  binding: StateBinding;
}

/** Custom logic block. Body defines `function run(state) { ... }`. */
export interface CodeNode extends BaseNode {
  type: "code";
  code: string;
}

/** Free-form HTML div populated by the author, targeted via its UUID. */
export interface CanvasNode extends BaseNode {
  type: "canvas";
  /** Auto-generated UUID used as the rendered div id. */
  elementId: string;
  html: string;
}

/** Union of every concrete node kind. */
export type ToolNode =
  | StateNode
  | TextRunResetNode
  | TextRunNode
  | TextareaNode
  | CodeNode
  | CanvasNode;

/** A named, ordered chain of nodes. */
export interface Tool {
  id: string;
  name: string;
  nodes: ToolNode[];
}

/** Where a selected node's editor is surfaced. */
export type EditorPlacement = "panel" | "inline" | "popover";

/** Nodes that produce visible output in the preview. */
export type RenderNode =
  | TextRunResetNode
  | TextRunNode
  | TextareaNode
  | CanvasNode;

/** Node kinds that produce visible output in the preview. */
export const RENDER_NODE_TYPES: ReadonlySet<ToolNodeType> =
  new Set<ToolNodeType>(["text_run_reset", "text_run", "textarea", "canvas"]);

/** Type guard: does this node render in the preview? */
export const isRenderNode = (n: ToolNode): n is RenderNode =>
  RENDER_NODE_TYPES.has(n.type);
