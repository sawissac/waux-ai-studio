/**
 * Domain types for the Tool Builder feature.
 *
 * A {@link Tool} is an ordered chain of {@link ToolNode}s that runs
 * top-to-bottom. Nodes share a flat key/value store defined by the single
 * {@link StateNode}; input nodes read/write it, code nodes transform it, and
 * render nodes surface it in the live preview.
 */

/** Icon/colour accent applied to a node type across the UI. */
export type NodeAccent =
  | "violet"
  | "blue"
  | "amber"
  | "emerald"
  | "pink"
  | "cyan";

/** Discriminator for every node kind the builder supports. */
export type ToolNodeType =
  | "state"
  | "text_run"
  | "button"
  | "textarea"
  | "markdown"
  | "json"
  | "csv"
  | "table"
  | "code_input"
  | "viewport"
  | "code"
  | "ts_type"
  | "canvas"
  | "ai";

/** Languages the Code editor input node can highlight (Monaco built-ins). */
export type CodeInputLanguage =
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "json"
  | "yaml"
  | "sql"
  | "python"
  | "xml"
  | "markdown"
  | "shell"
  | "plaintext";

/** Simulated screen the View Port node renders at in the preview. */
export type ViewportDevice = "responsive" | "desktop" | "mobile";

/** AI providers supported by the AI node. */
export type AiProvider = "gemini" | "openrouter";

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

/**
 * Single-line field. When `runEnabled` is true a run button (and Enter
 * keypress) trigger the code chain. When `resetEnabled` is true the field
 * clears itself after a run and a reset button is rendered.
 */
export interface TextRunNode extends BaseNode {
  type: "text_run";
  fieldLabel: string;
  description: string;
  placeholder: string;
  buttonText: string;
  binding: StateBinding;
  runEnabled: boolean;
  resetEnabled: boolean;
  resetText: string;
}

/**
 * Standalone action button. Renders no field — just a button (and optionally a
 * reset button) that triggers the code + AI chain. Use it to run logic that
 * reads existing state without a fresh text input.
 */
export interface ButtonNode extends BaseNode {
  type: "button";
  fieldLabel: string;
  description: string;
  buttonText: string;
  resetEnabled: boolean;
  resetText: string;
  /**
   * Ids of the code / AI nodes this button runs, in chain order. Empty means
   * run the whole chain (every code & AI node).
   */
  targets: string[];
  /**
   * Ids of the code nodes whose `reset()` runs when the reset button is
   * clicked, in chain order. Empty means reset the whole chain (every code
   * node). Only meaningful when `resetEnabled` is true.
   */
  resetTargets: string[];
}

/** Multi-line, two-way bound text field (e.g. a message body). */
export interface TextareaNode extends BaseNode {
  type: "textarea";
  fieldLabel: string;
  description: string;
  placeholder: string;
  binding: StateBinding;
  /** Editor height in px (preview). Omitted = type default. */
  editorHeight?: number;
}

/**
 * Multi-line, two-way bound Markdown field. The end user writes Markdown and
 * can toggle a live rendered preview; the raw source is stored in the bound
 * state slot. Supports GFM, math (KaTeX), and code highlighting.
 */
export interface MarkdownNode extends BaseNode {
  type: "markdown";
  fieldLabel: string;
  description: string;
  placeholder: string;
  binding: StateBinding;
  /** Editor height in px (preview, write & preview modes). Omitted = type default. */
  editorHeight?: number;
}

/**
 * Two-way bound JSON field rendered in a code editor. The end user pastes or
 * edits JSON; when the document parses, it is auto-formatted in place. The raw
 * source string is stored in the bound state slot (code nodes `JSON.parse` it).
 */
export interface JsonNode extends BaseNode {
  type: "json";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
  /** Editor height in px (preview). Omitted = type default. */
  editorHeight?: number;
}

/**
 * CSV file input. The end user uploads (or drops) a `.csv` file; it is parsed
 * client-side (PapaParse) into an optimized data array — empty rows skipped,
 * numbers/booleans typed, headers trimmed — and the **parsed array** (not the
 * raw text) is written to the bound state slot. With `hasHeader` the rows are
 * objects keyed by column name; without, plain `unknown[][]` rows.
 */
export interface CsvNode extends BaseNode {
  type: "csv";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
  /** Treat the first row as column names (rows become keyed objects). */
  hasHeader: boolean;
}

/** Rows-per-page options the Table input node supports. */
export type TablePageSize = 30 | 50 | 100;

/**
 * Read-only data table over the bound state slot. Accepts whatever lands in
 * the slot — an array of objects, an array of arrays, or a JSON string of
 * either — and auto-optimizes it for display (empty rows/columns dropped,
 * numeric/boolean strings typed). Every column sorts (a→z, 0→9, dates
 * auto-detected), resizes by dragging the header edge, and rows paginate at
 * 30 / 50 / 100 per page with the visible page virtualized.
 */
export interface TableNode extends BaseNode {
  type: "table";
  fieldLabel: string;
  description: string;
  /** State slot holding the array (or JSON string) to display. */
  binding: StateBinding;
  /** Default rows per page in the preview. */
  pageSize: TablePageSize;
}

/**
 * Two-way bound code field rendered in a Monaco editor with a selectable
 * language (syntax highlighting only — the source is never executed). The raw
 * source string is stored in the bound state slot.
 */
export interface CodeInputNode extends BaseNode {
  type: "code_input";
  fieldLabel: string;
  description: string;
  /** Editor language — drives syntax highlighting in the preview. */
  language: CodeInputLanguage;
  binding: StateBinding;
  /** Editor height in px (preview). Omitted = type default. */
  editorHeight?: number;
}

/**
 * Embedded website viewport. Shows the page at `url` inside a sandboxed
 * iframe in the preview. When the bound state slot holds a non-empty string
 * it overrides `url`, so a text input or code node can drive which page is
 * shown at runtime. Sites that forbid embedding (X-Frame-Options /
 * frame-ancestors) render blank — that is the remote site's policy.
 */
export interface ViewportNode extends BaseNode {
  type: "viewport";
  fieldLabel: string;
  description: string;
  /** Page to show. Used when the bound state slot is empty/unbound. */
  url: string;
  /** Optional state slot whose value overrides `url` at runtime. */
  binding: StateBinding;
  /** Viewport height in px (preview, `responsive` screen only). Omitted = type default. */
  editorHeight?: number;
  /**
   * Default simulated screen — end users can switch in the preview. Fixed
   * screens render the page at device width and scale down to fit the pane
   * (width simulation only; the site still sees a desktop user agent).
   * Omitted = `responsive` (nodes saved before the field existed).
   */
  device?: ViewportDevice;
}

/** Custom logic block. Body defines `function run(state) { ... }`. */
export interface CodeNode extends BaseNode {
  type: "code";
  description: string;
  code: string;
  /** Last AI provider selected in the Ask AI panel. */
  aiProvider?: AiProvider;
  /** Last AI model selected in the Ask AI panel. */
  aiModel?: string;
}

/**
 * Convert JSON held in a state slot into TypeScript type declarations.
 * Reads the raw JSON source from `input`, infers interfaces (nested objects
 * and arrays included), and writes the generated TypeScript into `output`.
 * Runs in the chain like a code node; also re-converts live as inputs change.
 */
export interface TsTypeNode extends BaseNode {
  type: "ts_type";
  description: string;
  /** Name of the generated root interface/type (e.g. `Root`, `User`). */
  rootName: string;
  /** State slot holding the JSON source string. */
  input: StateBinding;
  /** State slot the generated TypeScript is written into. */
  output: StateBinding;
}

/** Free-form HTML div populated by the author, targeted via its UUID. */
export interface CanvasNode extends BaseNode {
  type: "canvas";
  /** Auto-generated UUID used as the rendered div id. */
  elementId: string;
  html: string;
}

/**
 * Call a Gemini / OpenRouter model with a prompt template (supports
 * `{{stateName}}` interpolation) and write the reply into `output` state.
 */
export interface AiNode extends BaseNode {
  type: "ai";
  provider: AiProvider;
  /** Model id (e.g. `gemini-2.5-flash`, `openrouter/auto`). */
  model: string;
  /** Optional system instruction. Supports `{{state}}` interpolation. */
  systemInstruction: string;
  /** Prompt body. Supports `{{state}}` interpolation. */
  prompt: string;
  /** State slot the model reply is written into. */
  output: StateBinding;
  /** Render the reply as Markdown in the preview. */
  markdownOutput?: boolean;
}

/** Union of every concrete node kind. */
export type ToolNode =
  | StateNode
  | TextRunNode
  | ButtonNode
  | TextareaNode
  | MarkdownNode
  | JsonNode
  | CsvNode
  | TableNode
  | CodeInputNode
  | ViewportNode
  | CodeNode
  | TsTypeNode
  | CanvasNode
  | AiNode;

/** A named, ordered chain of nodes. */
export interface Tool {
  id: string;
  name: string;
  nodes: ToolNode[];
}

/** Where a selected node's editor is surfaced. */
export type EditorPlacement = "panel" | "inline";

/** Nodes that produce visible output in the preview. */
export type RenderNode =
  | TextRunNode
  | ButtonNode
  | TextareaNode
  | MarkdownNode
  | JsonNode
  | CsvNode
  | TableNode
  | CodeInputNode
  | ViewportNode
  | CanvasNode;

/** Node kinds that produce visible output in the preview. */
export const RENDER_NODE_TYPES: ReadonlySet<ToolNodeType> =
  new Set<ToolNodeType>([
    "text_run",
    "button",
    "textarea",
    "markdown",
    "json",
    "csv",
    "table",
    "code_input",
    "viewport",
    "canvas",
  ]);

/** Type guard: does this node render in the preview? */
export const isRenderNode = (n: ToolNode): n is RenderNode =>
  RENDER_NODE_TYPES.has(n.type);
