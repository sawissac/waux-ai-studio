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
  ArrowDownUp,
  Binary,
  Braces,
  CalendarClock,
  ChevronsLeftRight,
  CodeXml,
  Columns3,
  Database,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileUp,
  Filter as FilterIcon,
  FormInput,
  GitMerge,
  Globe,
  Hash,
  ImageUp,
  ListFilter,
  type LucideIcon,
  MousePointerClick,
  Palette,
  Regex as RegexIcon,
  Search,
  ShieldCheck,
  Shuffle,
  Sigma,
  Sparkles,
  Table,
  ToggleRight,
  Type as TypeIcon,
  Webhook,
} from "lucide-react";

import type {
  CodeInputLanguage,
  DateTimeMode,
  EncodeOperation,
  FileOutputFormat,
  FilterOperator,
  HttpMethod,
  HttpResponseType,
  JoinKind,
  NodeAccent,
  RegexMode,
  SchemaRule,
  SortDirection,
  SortType,
  TablePageSize,
  ToolNode,
  ToolNodeType,
  ViewportDevice,
} from "@/types/tool-builder";

/** Palette section a node type lives under. */
export type PaletteGroup = "Data" | "Inputs" | "Logic" | "Website Site";

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
  number: {
    type: "number",
    label: "Number",
    blurb:
      "Numeric value with a slider + number field. Set min / max / step; two-way bound to state.",
    accent: "blue",
    group: "Inputs",
    icon: Hash,
    slug: "@number",
  },
  select: {
    type: "select",
    label: "Select",
    blurb:
      "Single-choice dropdown. Use a static option list or bind the options to a state array.",
    accent: "blue",
    group: "Inputs",
    icon: ListFilter,
    slug: "@select",
  },
  toggle: {
    type: "toggle",
    label: "Toggle",
    blurb: "Boolean on/off switch, two-way bound to state.",
    accent: "blue",
    group: "Inputs",
    icon: ToggleRight,
    slug: "@toggle",
  },
  date: {
    type: "date",
    label: "Date / Time",
    blurb:
      "Date, time, or date-time picker. The native value writes straight to bound state.",
    accent: "blue",
    group: "Inputs",
    icon: CalendarClock,
    slug: "@date",
  },
  file: {
    type: "file",
    label: "File upload",
    blurb:
      "Upload any file. Encodes it as text, base64, or a data URL into bound state.",
    accent: "blue",
    group: "Inputs",
    icon: FileUp,
    slug: "@file",
  },
  image: {
    type: "image",
    label: "Image upload",
    blurb:
      "Upload an image with a live preview. Writes a data URL — feeds AI vision.",
    accent: "blue",
    group: "Inputs",
    icon: ImageUp,
    slug: "@image",
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
  http_request: {
    type: "http_request",
    label: "HTTP Request",
    blurb:
      "Call a real API through a server proxy. Method, URL, headers & body interpolate state; response writes to bound state.",
    accent: "amber",
    group: "Logic",
    icon: Webhook,
    slug: "@http_request",
  },
  filter: {
    type: "filter",
    label: "Filter",
    blurb:
      "Keep array rows whose field matches a condition; output writes to bound state.",
    accent: "amber",
    group: "Logic",
    icon: FilterIcon,
    slug: "@filter",
  },
  map: {
    type: "map",
    label: "Map / Transform",
    blurb:
      "Reshape array rows into new objects by mapping output keys to source paths.",
    accent: "amber",
    group: "Logic",
    icon: Shuffle,
    slug: "@map",
  },
  sort: {
    type: "sort",
    label: "Sort",
    blurb:
      "Order an array by a field, as text / number / date, ascending or descending.",
    accent: "amber",
    group: "Logic",
    icon: ArrowDownUp,
    slug: "@sort",
  },
  merge: {
    type: "merge",
    label: "Merge / Join",
    blurb:
      "Join two state arrays on a key — right fields spread over matching left rows.",
    accent: "amber",
    group: "Logic",
    icon: GitMerge,
    slug: "@merge",
  },
  template: {
    type: "template",
    label: "Template / String",
    blurb:
      "Interpolate {{name}} state tokens into a text template; result writes to bound state.",
    accent: "amber",
    group: "Logic",
    icon: TypeIcon,
    slug: "@template",
  },
  regex: {
    type: "regex",
    label: "Regex",
    blurb:
      "Test, match, extract groups, or replace over a string with a regular expression.",
    accent: "amber",
    group: "Logic",
    icon: RegexIcon,
    slug: "@regex",
  },
  jsonpath: {
    type: "jsonpath",
    label: "JSONPath / Query",
    blurb:
      "Pull a nested value out of JSON with a dotted/bracketed path (e.g. data.items[0].name).",
    accent: "amber",
    group: "Logic",
    icon: Search,
    slug: "@jsonpath",
  },
  math: {
    type: "math",
    label: "Math / Expression",
    blurb:
      "Evaluate a math expression over state (e.g. price * qty, sqrt, units, fractions) via mathjs; no JS eval.",
    accent: "amber",
    group: "Logic",
    icon: Sigma,
    slug: "@math",
  },
  schema_validate: {
    type: "schema_validate",
    label: "Schema Validate",
    blurb:
      "Check JSON shape against required field + type rules; writes a boolean to gate the chain.",
    accent: "amber",
    group: "Logic",
    icon: ShieldCheck,
    slug: "@schema_validate",
  },
  encode: {
    type: "encode",
    label: "Encode / Decode",
    blurb:
      "Base64 / URL encode-decode, or a one-way SHA-256 hash over a string; output writes to state.",
    accent: "amber",
    group: "Logic",
    icon: Binary,
    slug: "@encode",
  },
  canvas: {
    type: "canvas",
    label: "HTML Canvas",
    blurb: "A free-form HTML div you populate with elements via JS.",
    accent: "emerald",
    group: "Website Site",
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
        "number",
        "select",
        "toggle",
        "date",
        "file",
        "image",
        "textarea",
        "markdown",
        "json",
        "csv",
        "table",
        "code_input",
      ],
    },
    {
      group: "Logic",
      types: [
        "code",
        "ts_type",
        "http_request",
        "filter",
        "map",
        "sort",
        "merge",
        "template",
        "regex",
        "jsonpath",
        "math",
        "schema_validate",
        "encode",
        "ai",
      ],
    },
    {
      group: "Website Site",
      types: ["viewport", "convert_html", "html_sanitize", "themed", "canvas"],
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

/** Picker modes for the Date / Time node, in menu order. */
export const DATE_MODES: { value: DateTimeMode; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date & time" },
];

/** Native `<input type>` for each Date / Time picker mode. */
export const DATE_INPUT_TYPE: Record<DateTimeMode, string> = {
  date: "date",
  time: "time",
  datetime: "datetime-local",
};

/** Encodings the File upload node can write to state, in menu order. */
export const FILE_OUTPUT_FORMATS: {
  value: FileOutputFormat;
  label: string;
}[] = [
  { value: "text", label: "Text (UTF-8)" },
  { value: "base64", label: "Base64" },
  { value: "dataurl", label: "Data URL" },
];

/** HTTP verbs for the HTTP Request node, in menu order. */
export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

/** Response parse modes for the HTTP Request node, in menu order. */
export const HTTP_RESPONSE_TYPES: { value: HttpResponseType; label: string }[] =
  [
    { value: "json", label: "JSON" },
    { value: "text", label: "Text" },
  ];

/** Filter operators, in menu order (label resolved via i18n at render). */
export const FILTER_OPERATORS: FilterOperator[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "startsWith",
  "endsWith",
  "exists",
  "notExists",
];

/** Filter operators that ignore the comparison value. */
export const VALUELESS_FILTER_OPERATORS: ReadonlySet<FilterOperator> =
  new Set<FilterOperator>(["exists", "notExists"]);

/** Sort directions, in menu order. */
export const SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

/** Sort value types, in menu order. */
export const SORT_TYPES: SortType[] = ["string", "number", "date"];

/** Join kinds for the Merge node, in menu order. */
export const JOIN_KINDS: JoinKind[] = ["inner", "left"];

/** Regex modes, in menu order. */
export const REGEX_MODES: RegexMode[] = ["test", "match", "extract", "replace"];

/** Encode / decode operations, in menu order. */
export const ENCODE_OPERATIONS: { value: EncodeOperation; label: string }[] = [
  { value: "base64_encode", label: "Base64 encode" },
  { value: "base64_decode", label: "Base64 decode" },
  { value: "url_encode", label: "URL encode" },
  { value: "url_decode", label: "URL decode" },
  { value: "hash_sha256", label: "SHA-256 hash" },
];

/** Schema-rule value types, in menu order. */
export const SCHEMA_TYPES: SchemaRule["type"][] = [
  "any",
  "string",
  "number",
  "boolean",
  "object",
  "array",
];

/** Browser-safe UUID v4. */
export const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_CODE = `// runs when an input above triggers
async function run(state) {
  const input = state.get("input");
  if (!input) return;
  state.set("output", input.toUpperCase());
  // await state.copyToClipboard(input); // copy a string to the clipboard
}

// optional: runs live as inputs change
async function change(state) {
  // e.g. state.set("output", state.get("input") || "");
}

// optional: runs when a reset button is clicked
async function reset(state) {
  state.set("input", "");
  state.set("output", "");
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
        targets: [],
        resetTargets: [],
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
    case "number":
      return {
        id,
        type,
        fieldLabel: "Number",
        description: "",
        binding: { mode: "name", value: "state1" },
        min: 0,
        max: 100,
        step: 1,
      };
    case "select":
      return {
        id,
        type,
        fieldLabel: "Select",
        description: "",
        binding: { mode: "name", value: "state1" },
        options: [
          { id: uuid(), value: "option1", label: "Option 1" },
          { id: uuid(), value: "option2", label: "Option 2" },
        ],
        optionsBinding: { mode: "name", value: "" },
      };
    case "toggle":
      return {
        id,
        type,
        fieldLabel: "Toggle",
        description: "",
        binding: { mode: "name", value: "state1" },
      };
    case "date":
      return {
        id,
        type,
        fieldLabel: "Date",
        description: "",
        binding: { mode: "name", value: "state1" },
        mode: "date",
      };
    case "file":
      return {
        id,
        type,
        fieldLabel: "File",
        description: "",
        binding: { mode: "name", value: "state1" },
        outputFormat: "text",
        accept: "",
      };
    case "image":
      return {
        id,
        type,
        fieldLabel: "Image",
        description: "",
        binding: { mode: "name", value: "state1" },
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
        previewEnabled: true,
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
        previewEnabled: true,
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
        previewEnabled: true,
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
    case "http_request":
      return {
        id,
        type,
        description: "",
        method: "GET",
        url: "https://api.example.com/data",
        headers: [],
        input: { mode: "name", value: "" },
        body: "",
        responseType: "json",
        output: { mode: "name", value: "state1" },
      };
    case "filter":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
        field: "",
        operator: "eq",
        value: "",
      };
    case "map":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
        fields: [{ id: uuid(), to: "field", from: "field" }],
      };
    case "sort":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
        field: "",
        direction: "asc",
        sortType: "string",
      };
    case "merge":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        rightInput: { mode: "name", value: "" },
        output: { mode: "name", value: "state1" },
        leftKey: "id",
        rightKey: "id",
        joinKind: "inner",
      };
    case "template":
      return {
        id,
        type,
        description: "",
        template: "Hello {{state1}}",
        output: { mode: "name", value: "state1" },
      };
    case "regex":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
        pattern: "",
        flags: "g",
        mode: "match",
        replacement: "",
      };
    case "jsonpath":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
        path: "",
      };
    case "math":
      return {
        id,
        type,
        description: "",
        expression: "state1",
        output: { mode: "name", value: "state1" },
      };
    case "schema_validate":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
        errorOutput: { mode: "name", value: "" },
        rules: [{ id: uuid(), field: "", type: "any" }],
      };
    case "encode":
      return {
        id,
        type,
        description: "",
        input: { mode: "name", value: "state1" },
        output: { mode: "name", value: "state1" },
        operation: "base64_encode",
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
        prompt: "Summarize: {{state1}}",
        output: { mode: "name", value: "state1" },
      };
  }
}
