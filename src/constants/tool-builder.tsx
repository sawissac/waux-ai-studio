/**
 * Static catalogue describing every node type: palette grouping, labels,
 * accent colour, icon, the `@slug` shown in editors, and a factory that
 * produces a fresh node of that type with sensible defaults.
 *
 * Kept beside the feature (not in `src/constants`) because nothing outside
 * Tool Builder consumes it.
 */
import {
  AlignLeft,
  Braces,
  ChevronsLeftRight,
  CodeXml,
  Columns3,
  Database,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType2,
  FormInput,
  Globe,
  type LucideIcon,
  MousePointerClick,
  Palette,
  ShieldCheck,
  Sparkles,
  Table,
} from "lucide-react";

import type {
  CodeInputLanguage,
  NodeAccent,
  TablePageSize,
  ToolNode,
  ToolNodeType,
  ViewportDevice,
} from "@/types/tool-builder";

/** Palette section a node type lives under. */
export type PaletteGroup =
  | "Data"
  | "Inputs"
  | "Logic"
  | "Output"
  | "Website Site";

/** Display + behaviour metadata for one node type. */
export interface NodeMeta {
  type: ToolNodeType;
  label: string;
  blurb: string;
  accent: NodeAccent;
  group: PaletteGroup;
  icon: LucideIcon;
  /** Mono `@slug` shown in the editor header. */
  slug: string;
}

/** Tailwind classes for an accent's icon chip (bg + foreground). */
export const ACCENT_CLASSES: Record<NodeAccent, string> = {
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  pink: "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
};

/** Per-type metadata, keyed by node type. */
export const NODE_META: Record<ToolNodeType, NodeMeta> = {
  state: {
    type: "state",
    label: "State Control",
    blurb: "Define & manage the shared state this tool operates on.",
    accent: "violet",
    group: "Data",
    icon: Database,
    slug: "@state",
  },
  text_run: {
    type: "text_run",
    label: "Text",
    blurb:
      "Single-line field that triggers a run. Toggle run & reset to clear after running.",
    accent: "blue",
    group: "Inputs",
    icon: FormInput,
    slug: "@text_run",
  },
  button: {
    type: "button",
    label: "Button",
    blurb:
      "Standalone action button that runs the chain — no text field. Optional reset button too.",
    accent: "blue",
    group: "Inputs",
    icon: MousePointerClick,
    slug: "@button",
  },
  textarea: {
    type: "textarea",
    label: "Textarea",
    blurb: "Multi-line text field, e.g. a message body.",
    accent: "blue",
    group: "Inputs",
    icon: AlignLeft,
    slug: "@textarea",
  },
  markdown: {
    type: "markdown",
    label: "Markdown",
    blurb: "Multi-line Markdown field with a live rendered preview toggle.",
    accent: "blue",
    group: "Inputs",
    icon: FileText,
    slug: "@markdown",
  },
  json: {
    type: "json",
    label: "JSON",
    blurb:
      "Paste or edit JSON in a code editor. Valid JSON auto-formats; raw source writes to bound state.",
    accent: "blue",
    group: "Inputs",
    icon: Braces,
    slug: "@json",
  },
  csv: {
    type: "csv",
    label: "CSV",
    blurb:
      "Upload a CSV file. Parsed rows (typed, empty rows/columns dropped) write to bound state as an array.",
    accent: "blue",
    group: "Inputs",
    icon: FileSpreadsheet,
    slug: "@csv",
  },
  table: {
    type: "table",
    label: "Table",
    blurb:
      "Display bound array data in a sortable, resizable, paginated table. Data is auto-optimized for display.",
    accent: "blue",
    group: "Inputs",
    icon: Table,
    slug: "@table",
  },
  code_input: {
    type: "code_input",
    label: "Code editor",
    blurb:
      "Write or paste code in a Monaco editor with a selectable language; raw source writes to bound state.",
    accent: "blue",
    group: "Inputs",
    icon: FileCode2,
    slug: "@code_input",
  },
  viewport: {
    type: "viewport",
    label: "View Port",
    blurb:
      "Embed a website by URL in a sandboxed frame. Bind a state slot to drive the URL at runtime.",
    accent: "cyan",
    group: "Website Site",
    icon: Globe,
    slug: "@viewport",
  },
  convert_html: {
    type: "convert_html",
    label: "Convert to HTML",
    blurb:
      "Copy a View Port page's static layout — HTML with its CSS inlined — into a state slot.",
    accent: "cyan",
    group: "Website Site",
    icon: CodeXml,
    slug: "@convert_html",
  },
  themed: {
    type: "themed",
    label: "Themed",
    blurb:
      "Read static page HTML from state and click any element to recolor it — every identical element updates too.",
    accent: "cyan",
    group: "Website Site",
    icon: Palette,
    slug: "@themed",
  },
  html_sanitize: {
    type: "html_sanitize",
    label: "HTML Sanitize",
    blurb:
      "Clean HTML from a state slot with sanitize-html — strips scripts & unsafe markup; output writes to bound state.",
    accent: "cyan",
    group: "Website Site",
    icon: ShieldCheck,
    slug: "@html_sanitize",
  },
  code: {
    type: "code",
    label: "Code",
    blurb: "A code block for custom logic / processing.",
    accent: "amber",
    group: "Logic",
    icon: ChevronsLeftRight,
    slug: "@code",
  },
  ts_type: {
    type: "ts_type",
    label: "TS Type Converter",
    blurb:
      "Convert JSON from a state slot into TypeScript interfaces; output writes to bound state.",
    accent: "amber",
    group: "Logic",
    icon: FileType2,
    slug: "@ts_type",
  },
  canvas: {
    type: "canvas",
    label: "HTML Canvas",
    blurb: "A free-form HTML div you populate with elements via JS.",
    accent: "emerald",
    group: "Output",
    icon: Columns3,
    slug: "@canvas",
  },
  ai: {
    type: "ai",
    label: "AI",
    blurb:
      "Ask Gemini or OpenRouter. Interpolate state via {{name}} in the prompt; reply writes to bound state.",
    accent: "pink",
    group: "Logic",
    icon: Sparkles,
    slug: "@ai",
  },
};

/** Palette order: groups, and node types within each group. */
export const PALETTE_GROUPS: { group: PaletteGroup; types: ToolNodeType[] }[] =
  [
    { group: "Data", types: ["state"] },
    {
      group: "Inputs",
      types: [
        "text_run",
        "button",
        "textarea",
        "markdown",
        "json",
        "csv",
        "table",
        "code_input",
      ],
    },
    { group: "Logic", types: ["code", "ts_type", "ai"] },
    { group: "Output", types: ["canvas"] },
    {
      group: "Website Site",
      types: ["viewport", "convert_html", "html_sanitize", "themed"],
    },
  ];

/**
 * Preview editor heights (px) for resizable input nodes: per-type defaults
 * (also the fallback for nodes saved before the field existed) and the clamp
 * range enforced by the node-config height control.
 */
export const EDITOR_HEIGHTS = {
  min: 80,
  max: 800,
  defaults: {
    textarea: 120,
    markdown: 220,
    json: 220,
    code_input: 220,
    viewport: 480,
    convert_html: 480,
    themed: 480,
  },
} as const;

/** Rows-per-page options for the Table input node, in menu order. */
export const TABLE_PAGE_SIZES: TablePageSize[] = [30, 50, 100];

/**
 * Simulated screens for the View Port node, in toggle order. Fixed-size
 * screens render the iframe at `width × height` and scale it down to fit the
 * preview pane; `responsive` (no dimensions) fills the pane width at the
 * node's editor height.
 */
export const VIEWPORT_DEVICES: {
  value: ViewportDevice;
  label: string;
  width?: number;
  height?: number;
}[] = [
  { value: "responsive", label: "Fill" },
  { value: "desktop", label: "Desktop", width: 1440, height: 900 },
  { value: "mobile", label: "Mobile", width: 390, height: 844 },
];

/** Selectable languages for the Code editor input node, in menu order. */
export const CODE_INPUT_LANGUAGES: {
  value: CodeInputLanguage;
  label: string;
}[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "sql", label: "SQL" },
  { value: "python", label: "Python" },
  { value: "xml", label: "XML" },
  { value: "markdown", label: "Markdown" },
  { value: "shell", label: "Shell" },
  { value: "plaintext", label: "Plain text" },
];

/** Browser-safe UUID v4. */
export const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_CODE = `// runs when an input above triggers
async function run(state) {
  const email = state.get("email");
  if (!email) return;
  const log = state.get("message") || "";
  state.set("message", log + "Subscribed: " + email + "\\n");
  // await state.copyToClipboard(email); // copy a string to the clipboard
}

// optional: runs live as inputs change
async function change(state) {
  // e.g. state.set("message", state.get("email") || "");
}

// optional: runs when a reset button is clicked
async function reset(state) {
  state.set("email", "");
  state.set("message", "");
}`;

/**
 * Build a fresh node of `type` with default config and a unique id.
 *
 * @param type - Node kind to create.
 * @returns A ready-to-insert {@link ToolNode}.
 */
export function createNode(type: ToolNodeType): ToolNode {
  const id = uuid();
  switch (type) {
    case "state":
      return { id, type, states: [{ id: uuid(), name: "state1", value: "" }] };
    case "text_run":
      return {
        id,
        type,
        fieldLabel: "Field",
        description: "",
        placeholder: "Type here…",
        buttonText: "Run",
        binding: { mode: "name", value: "state1" },
        runEnabled: true,
        resetEnabled: false,
        resetText: "Reset",
      };
    case "button":
      return {
        id,
        type,
        fieldLabel: "",
        description: "",
        buttonText: "Run",
        resetEnabled: false,
        resetText: "Reset",
        targets: [],
        resetTargets: [],
      };
    case "textarea":
      return {
        id,
        type,
        fieldLabel: "Message",
        description: "",
        placeholder: "Write a message…",
        binding: { mode: "name", value: "state1" },
        editorHeight: EDITOR_HEIGHTS.defaults.textarea,
      };
    case "markdown":
      return {
        id,
        type,
        fieldLabel: "Markdown",
        description: "",
        placeholder: "# Write Markdown…",
        binding: { mode: "name", value: "state1" },
        editorHeight: EDITOR_HEIGHTS.defaults.markdown,
      };
    case "json":
      return {
        id,
        type,
        fieldLabel: "JSON",
        description: "",
        binding: { mode: "name", value: "state1" },
        editorHeight: EDITOR_HEIGHTS.defaults.json,
      };
    case "csv":
      return {
        id,
        type,
        fieldLabel: "CSV file",
        description: "",
        binding: { mode: "name", value: "state1" },
        hasHeader: true,
      };
    case "table":
      return {
        id,
        type,
        fieldLabel: "Table",
        description: "",
        binding: { mode: "name", value: "state1" },
        pageSize: TABLE_PAGE_SIZES[0],
      };
    case "code_input":
      return {
        id,
        type,
        fieldLabel: "Code",
        description: "",
        language: "javascript",
        binding: { mode: "name", value: "state1" },
        editorHeight: EDITOR_HEIGHTS.defaults.code_input,
      };
    case "viewport":
      return {
        id,
        type,
        fieldLabel: "Website",
        description: "",
        url: "",
        binding: { mode: "name", value: "" },
        editorHeight: EDITOR_HEIGHTS.defaults.viewport,
        device: "responsive",
        previewEnabled: false,
      };
    case "convert_html":
      return {
        id,
        type,
        fieldLabel: "Convert to HTML",
        description: "",
        source: "",
        binding: { mode: "name", value: "" },
        editorHeight: EDITOR_HEIGHTS.defaults.convert_html,
        device: "responsive",
        previewEnabled: false,
      };
    case "themed":
      return {
        id,
        type,
        fieldLabel: "Themed website",
        description: "",
        binding: { mode: "name", value: "" },
        editorHeight: EDITOR_HEIGHTS.defaults.themed,
        device: "responsive",
        previewEnabled: false,
      };
    case "html_sanitize":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "" },
        output: { mode: "name", value: "" },
        allowStyles: true,
        allowImages: true,
      };
    case "code":
      return { id, type, description: "", code: DEFAULT_CODE };
    case "ts_type":
      return {
        id,
        type,
        description: "",
        rootName: "Root",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
      };
    case "canvas": {
      const elementId = uuid();
      return {
        id,
        type,
        elementId,
        html: `<div id="${elementId}">\n  <h4>Canvas output</h4>\n  <p>Drawn from JS into a plain &lt;div&gt;.</p>\n</div>`,
      };
    }
    case "ai":
      return {
        id,
        type,
        provider: "gemini",
        model: "gemini-2.5-flash",
        systemInstruction: "",
        prompt: "Summarize: {{state1}}",
        output: { mode: "name", value: "state1" },
      };
  }
}
