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
  | "number"
  | "select"
  | "toggle"
  | "date"
  | "file"
  | "image"
  | "textarea"
  | "markdown"
  | "json"
  | "csv"
  | "table"
  | "chart"
  | "sprite"
  | "code_input"
  | "viewport"
  | "convert_html"
  | "themed"
  | "html_sanitize"
  | "code"
  | "ts_type"
  | "http_request"
  | "playwright_scrape"
  | "filter"
  | "map"
  | "sort"
  | "merge"
  | "template"
  | "regex"
  | "jsonpath"
  | "math"
  | "schema_validate"
  | "encode"
  | "csv_to_md"
  | "counter"
  | "download"
  | "vault"
  | "identity"
  | "xlsx"
  | "aggregate"
  | "mermaid"
  | "highlight"
  | "qrcode"
  | "tts"
  | "stt"
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

/** Temporal input mode for the Date / Time node. */
export type DateTimeMode = "date" | "time" | "datetime";

/** How the File upload node encodes the chosen file into its bound state. */
export type FileOutputFormat = "text" | "base64" | "dataurl";

/** AI providers supported by the AI node. */
export type AiProvider = "gemini" | "openrouter";

/** HTTP verbs the HTTP Request node can issue. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** How the HTTP Request node parses the response into its output state. */
export type HttpResponseType = "json" | "text";

/** Comparison operators the Filter node supports. */
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "exists"
  | "notExists";

/** Sort direction for the Sort node. */
export type SortDirection = "asc" | "desc";

/** Value type the Sort node compares as. */
export type SortType = "string" | "number" | "date";

/** Join kind for the Merge / Join node. */
export type JoinKind = "inner" | "left";

/** Mode the Regex node runs in. */
export type RegexMode = "match" | "extract" | "replace" | "test";

/** Operation the Encode / Decode node performs. */
export type EncodeOperation =
  | "base64_encode"
  | "base64_decode"
  | "url_encode"
  | "url_decode"
  | "hash_sha256";

/** Color theme for the Mermaid diagram node. */
export type MermaidTheme = "default" | "neutral" | "dark" | "forest";

/** Shiki color theme for the Highlight (syntax) node. */
export type HighlightTheme =
  | "github-dark"
  | "github-light"
  | "nord"
  | "dracula"
  | "monokai"
  | "min-light";

/** Reducer the Aggregate node applies over each group, per output column. */
export type AggregateOp =
  | "count"
  | "sum"
  | "mean"
  | "median"
  | "mode"
  | "min"
  | "max"
  | "distinct"
  | "stdev"
  | "variance";

/** Error-correction level for the QR Code node (higher = more redundancy). */
export type QrLevel = "L" | "M" | "Q" | "H";

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
  /**
   * Ids of the code / AI nodes this field's run runs, in chain order. Empty
   * means run the whole chain (every code & AI node).
   */
  targets: string[];
  /**
   * Ids of the code nodes whose `reset()` runs when the reset button is
   * clicked, in chain order. Empty means reset the whole chain (every code
   * node). Only meaningful when `resetEnabled` is true.
   */
  resetTargets: string[];
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

/**
 * Numeric input — a number field paired with a slider, two-way bound to its
 * state slot. `min` / `max` / `step` constrain both controls; the value is
 * stored as a stringified number (consistent with the flat string state map).
 */
export interface NumberNode extends BaseNode {
  type: "number";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
  /** Lowest allowed value (inclusive). */
  min: number;
  /** Highest allowed value (inclusive). */
  max: number;
  /** Increment for the slider and number stepper. */
  step: number;
}

/** One choice in a Select node's static option list. */
export interface SelectOption {
  /** Stable id for list keying. */
  id: string;
  /** Stored value written to state when chosen. */
  value: string;
  /** Display text; falls back to `value` when blank. */
  label: string;
}

/**
 * Single-choice dropdown, two-way bound to its state slot. Options come from
 * the static `options` list, unless `optionsBinding` names a state slot holding
 * an array (of strings, or `{ value, label }` objects) — then the list is
 * driven by that state at runtime.
 */
export interface SelectNode extends BaseNode {
  type: "select";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
  /** Static choices (used when `optionsBinding` is unset/empty). */
  options: SelectOption[];
  /** Optional state slot whose array value supplies the options at runtime. */
  optionsBinding: StateBinding;
}

/**
 * Boolean flag rendered as a switch, two-way bound to its state slot. The bound
 * value is stored as the string `"true"` / `"false"` (flat string state map).
 */
export interface ToggleNode extends BaseNode {
  type: "toggle";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
}

/**
 * Temporal input (date, time, or both) two-way bound to its state slot. The
 * native control's string value (ISO-ish `YYYY-MM-DD` / `HH:mm` /
 * `YYYY-MM-DDTHH:mm`) is written straight to state.
 */
export interface DateNode extends BaseNode {
  type: "date";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
  /** Which native picker to render. */
  mode: DateTimeMode;
}

/**
 * Generic file upload. The chosen file is encoded per `outputFormat` and the
 * encoded string is written to the bound state slot:
 * `text` (UTF-8 contents), `base64` (raw base64, no prefix), or `dataurl`
 * (a `data:` URI). Optional `accept` narrows the file picker (e.g. `.pdf`).
 */
export interface FileNode extends BaseNode {
  type: "file";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
  /** How the file bytes are encoded into state. */
  outputFormat: FileOutputFormat;
  /** Native `accept` filter (e.g. `.pdf,.txt`). Empty = any file. */
  accept: string;
}

/**
 * Image upload with a live thumbnail. The chosen image is written to the bound
 * state slot as a `data:` URL — ready to feed an AI vision prompt or render in
 * a Markdown node.
 */
export interface ImageNode extends BaseNode {
  type: "image";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
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

/** Visualization styles the Chart node can render. */
export type ChartType = "bar" | "line" | "area" | "pie" | "scatter";

/**
 * Read-only chart over the bound state slot. Accepts the same shapes as the
 * Table node — an array of objects, an array of arrays, or a JSON string of
 * either (e.g. CSV rows) — and auto-resolves which columns to plot: the first
 * text/date column becomes the category (X) axis and every numeric column
 * becomes a value (Y) series. Either can be overridden. Rendered with d3.
 */
export interface ChartNode extends BaseNode {
  type: "chart";
  fieldLabel: string;
  description: string;
  /** State slot holding the array (or JSON string) to plot. */
  binding: StateBinding;
  /** Visualization style. */
  chartType: ChartType;
  /** Category / X-axis column key. Empty string = auto-detect. */
  xField: string;
  /** Numeric series column keys to plot. Empty = auto-detect all numeric. */
  yFields: string[];
  /** Show the series / category legend. */
  showLegend: boolean;
  /** Show axis gridlines. */
  showGrid: boolean;
  /** Chart height in px (preview). */
  height: number;
}

/** Built-in sprite animation actions, surfaced as preview control buttons. */
export type SpriteAction = "idle" | "intro" | "left" | "right" | "click";

/** One named animation track inside a {@link SpriteNode}. */
export interface SpriteAnimation {
  /** Stable id for list keying. */
  id: string;
  /** Action key — labels the control button and is the trigger target. */
  action: SpriteAction;
  /**
   * State slot holding this track's frame array. Empty string = fall back to
   * the node's default `binding`, so several actions can share one frame set.
   */
  binding: StateBinding;
  /** Loop forever (true) or play once then settle back to the idle track. */
  loop: boolean;
}

/**
 * Sprite animation viewer (preview-only). Reads an array of image frames from
 * a bound state slot and plays them as a flip-book at `fps`, scaled to
 * `frameWidth` × `frameHeight`. Frames may be image URLs, `data:` URLs, or
 * objects with a `src` / `url` field, and may arrive as a real array or a JSON
 * string of one. Each {@link SpriteAnimation} track is a control button in the
 * preview (idle / intro / left / right / click by default); a track with its
 * own `binding` plays that frame set, otherwise it reuses the node's default
 * `binding`. The first/idle track auto-plays and play-once tracks settle back
 * to it. The node never writes to state.
 */
export interface SpriteNode extends BaseNode {
  type: "sprite";
  fieldLabel: string;
  description: string;
  /** Default frames source: a state slot holding the array of image frames. */
  binding: StateBinding;
  /** Frame display width in px. */
  frameWidth: number;
  /** Frame display height in px. */
  frameHeight: number;
  /** Playback speed in frames per second. */
  fps: number;
  /** Animation tracks exposed as control buttons; the first is the idle loop. */
  animations: SpriteAnimation[];
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
  /**
   * Render the live preview frame? Off by default — the iframe (and its
   * network load) is skipped until the author flips the switch, so adding the
   * node doesn't immediately fetch a page. Omitted/false = off.
   */
  previewEnabled?: boolean;
}

/**
 * Convert to HTML. Copies the static layout of a View Port node's page —
 * HTML with linked CSS inlined, scripts stripped — through the server-side
 * site proxy and writes the document into the bound state slot, so code
 * nodes, AI nodes, or a Themed node can consume it. Shows the snapshot in a
 * script-free sandboxed frame with a copy-to-clipboard button.
 */
export interface ConvertHtmlNode extends BaseNode {
  type: "convert_html";
  fieldLabel: string;
  description: string;
  /** Id of the View Port node whose page is snapshotted. "" = first viewport. */
  source: string;
  /** State slot the static HTML (CSS inlined) is written into. */
  binding: StateBinding;
  /** Frame height in px (preview, `responsive` screen only). Omitted = type default. */
  editorHeight?: number;
  /**
   * Default simulated screen for the snapshot frame — end users can switch
   * in the preview. Same semantics as {@link ViewportNode.device}.
   */
  device?: ViewportDevice;
  /**
   * Render the live preview frame? Off by default — the server-side snapshot
   * (and its network load) is skipped until the author flips the switch.
   * Omitted/false = off. Same semantics as {@link ViewportNode.previewEnabled}.
   */
  previewEnabled?: boolean;
}

/**
 * Themed website output. Reads static page HTML (CSS inlined) from the bound
 * state slot — typically a Convert to HTML node's output — and renders it in a
 * sandboxed frame where clicking any element recolors that element and every
 * identical element (same tag + classes) live. Does not connect to a View Port.
 */
export interface ThemedNode extends BaseNode {
  type: "themed";
  fieldLabel: string;
  description: string;
  /** State slot holding the static HTML document to recolor. */
  binding: StateBinding;
  /** Frame height in px (preview, `responsive` screen only). Omitted = type default. */
  editorHeight?: number;
  /**
   * Default simulated screen for the recolored frame — end users can switch
   * in the preview. Same semantics as {@link ViewportNode.device}.
   */
  device?: ViewportDevice;
  /**
   * Render the live preview frame? Off by default — the recolor iframe is
   * skipped until the author flips the switch. Omitted/false = off. Same
   * semantics as {@link ViewportNode.previewEnabled}.
   */
  previewEnabled?: boolean;
}

/**
 * Sanitize HTML held in a state slot with `sanitize-html`. Reads the raw HTML
 * from `input`, strips dangerous content (scripts, event handlers, unsafe
 * URL schemes), and writes the cleaned markup to `output`. Runs in the chain
 * like a transform node and also re-sanitizes live as the input changes.
 *
 * The two toggles widen the allowlist for common page content:
 * `allowStyles` keeps `<style>` blocks, inline `style=""`, and `class`
 * attributes (so the result still themes correctly); `allowImages` keeps
 * `<img>`/`<picture>` and their `src` (including `data:` image URIs).
 */
export interface HtmlSanitizeNode extends BaseNode {
  type: "html_sanitize";
  description: string;
  /** State slot holding the raw HTML to clean. */
  input: StateBinding;
  /** State slot the sanitized HTML is written into. */
  output: StateBinding;
  /** Keep `<style>` blocks, inline styles, and `class`/`id` attributes. */
  allowStyles: boolean;
  /** Keep `<img>`/`<picture>` tags and their `src` (incl. `data:` URIs). */
  allowImages: boolean;
}

/** One request header for the HTTP Request node. */
export interface HttpHeader {
  /** Stable id for list keying. */
  id: string;
  key: string;
  /** Supports `{{stateName}}` interpolation. */
  value: string;
}

/**
 * Issue an HTTP request through the server-side proxy (`/api/http-proxy`,
 * SSRF-guarded) and write the response into `output`. `url` / `body` / header
 * values support `{{stateName}}` interpolation against the shared state. The
 * response is parsed per `responseType` (parsed JSON, or raw text). Runs in
 * the chain like a transform node; not re-run live on `change`.
 */
export interface HttpRequestNode extends BaseNode {
  type: "http_request";
  description: string;
  method: HttpMethod;
  /** Request URL. Supports `{{stateName}}` interpolation. */
  url: string;
  headers: HttpHeader[];
  /**
   * Optional state slot exposed as the `{{input}}` token when interpolating the
   * `url`, header values, and `body` — letting an upstream node (e.g. a Map or
   * Code transform) drive any part of the request. Leave unbound to omit it.
   */
  input: StateBinding;
  /** Request body (ignored for GET). Supports `{{stateName}}` interpolation. */
  body: string;
  /** How the response is parsed before writing to `output`. */
  responseType: HttpResponseType;
  /** State slot the parsed response is written into. */
  output: StateBinding;
}

/** When a Playwright Scraper considers a navigation finished (Playwright `waitUntil`). */
export type ScrapeWaitUntil =
  | "load"
  | "domcontentloaded"
  | "networkidle"
  | "commit";

/**
 * One extraction rule for a Playwright Scraper, edited as a form row. Compiled
 * to the server's selector contract: `text` (default), or `attr` / `html` /
 * `meta`, optionally `all` (array over every match) — precedence meta > attr >
 * html > text. `key` is the output key in the returned `data` object.
 */
export interface ScrapeSelector {
  /** Stable id for list keying. */
  id: string;
  /** Output key in the `data` object. */
  key: string;
  /** CSS selector. Supports `{{stateName}}` interpolation. */
  selector: string;
  /** Return an array over every match (vs. the first only). */
  all: boolean;
  /** Return this attribute instead of text (blank = text). */
  attr: string;
  /** Return `innerHTML` instead of text. */
  html: boolean;
  /** Return `{ tag, attrs, text }` per element (overrides attr/html). */
  meta: boolean;
  /** With `meta`, drop the noisy `class` attribute. */
  excludeClass: boolean;
}

/** The kind of a Playwright Scraper pre-extraction action. */
export type ScrapeActionType =
  | "fill"
  | "click"
  | "press"
  | "goto"
  | "waitForSelector"
  | "waitForLoadState"
  | "waitForURL"
  | "waitForTimeout";

/**
 * One pre-extraction step for a Playwright Scraper, edited as a form row. Only
 * the fields relevant to `type` are used when compiling the server's `actions`
 * contract (e.g. `fill` uses selector + value; `goto`/`waitForURL` use url;
 * `press` uses selector + key; `waitForLoadState` uses state; `waitForTimeout`
 * uses ms). String fields support `{{stateName}}` interpolation.
 */
export interface ScrapeAction {
  /** Stable id for list keying. */
  id: string;
  type: ScrapeActionType;
  /** Target element (fill / click / press / waitForSelector). */
  selector: string;
  /** Text to type (fill). */
  value: string;
  /** Key to press, e.g. `Enter` (press). */
  key: string;
  /** Navigation / match URL (goto / waitForURL — glob/regex for the latter). */
  url: string;
  /** Load state to await, e.g. `networkidle` (waitForLoadState). */
  state: string;
  /** Milliseconds to sleep (waitForTimeout). */
  ms: number;
}

/**
 * Scrape a JavaScript-rendered page with a real Chromium browser, driven by the
 * **local** Playwright scrape server in this repo (`playwright/server/scrape-server.mjs`).
 *
 * This node POSTs to that server's `/scrape` endpoint — whose base URL the
 * author supplies manually in `serverUrl` (there is no hosted default; the
 * server must be running locally, see `playwright/SCRAPE.md`). It optionally
 * drives the page first (log in, click, navigate) via `actions`, waits for the
 * content to render, extracts values with the CSS-selector `selectors` map, and
 * writes the returned `data` object into the bound `output` slot.
 *
 * `url`, and the `selectors` / `actions` JSON, support `{{stateName}}`
 * interpolation (plus the optional `{{input}}` token), so an upstream node can
 * drive the target page, credentials, or selectors. Runs in the chain like a
 * transform node (only on a run, never live as you type), exactly like
 * {@link HttpRequestNode}.
 */
export interface PlaywrightScrapeNode extends BaseNode {
  type: "playwright_scrape";
  description: string;
  /**
   * Base URL of the LOCAL scrape server's endpoint, e.g.
   * `http://localhost:3001/scrape`. Required and author-supplied — the server
   * runs locally in this repo (`pnpm --dir playwright serve`); there is no
   * remote fallback.
   */
  serverUrl: string;
  /** Page (or login page) to open first. Supports `{{stateName}}` interpolation. */
  url: string;
  /** When `goto` is considered finished. */
  waitUntil: ScrapeWaitUntil;
  /** Optional CSS selector to wait for after navigation/actions, before extraction. */
  waitForSelector: string;
  /** Per-step timeout in ms (navigation + each wait/action), capped by the server's `MAX_TIMEOUT`. */
  timeout: number;
  /**
   * Extraction rules (form rows), compiled to the server's `selectors` map by
   * output key. Each rule's `selector` (and `attr`) support `{{stateName}}`
   * interpolation.
   */
  selectors: ScrapeSelector[];
  /**
   * Pre-extraction steps (form rows) run after `goto` and before extraction,
   * compiled to the server's `actions` contract. String fields support
   * `{{stateName}}` interpolation.
   */
  actions: ScrapeAction[];
  /** Reuse a saved server session by name (skip the login actions). Blank = none. */
  session: string;
  /** After a successful run, store the logged-in session under this name on the server. Blank = don't save. */
  saveSession: string;
  /**
   * Optional state slot exposed as the `{{input}}` token when interpolating the
   * `url`, `selectors`, and `actions`. Leave unbound to omit it.
   */
  input: StateBinding;
  /** State slot the returned `data` object (your `selectors` map, resolved) is written into. */
  output: StateBinding;
}

/**
 * Keep only the array rows from `input` whose `field` satisfies `operator`
 * against `value`, writing the filtered array to `output`. `field` reads a
 * (optionally dotted) path on each row; for primitive rows leave it blank to
 * test the row itself. Numeric comparisons coerce both sides to numbers.
 */
export interface FilterNode extends BaseNode {
  type: "filter";
  description: string;
  input: StateBinding;
  output: StateBinding;
  /** Dotted path into each row (blank = the row itself). */
  field: string;
  operator: FilterOperator;
  /** Comparison value (ignored for exists / notExists). */
  value: string;
}

/** One output-field mapping for the Map node. */
export interface MapField {
  /** Stable id for list keying. */
  id: string;
  /** Output key name. */
  to: string;
  /** Dotted source path on each input row. */
  from: string;
}

/**
 * Reshape each array row from `input` into a new object built from `fields`
 * (each `to` key copies the value at the row's `from` path), writing the
 * mapped array to `output`. Use it to project / rename columns before a Table.
 */
export interface MapNode extends BaseNode {
  type: "map";
  description: string;
  input: StateBinding;
  output: StateBinding;
  fields: MapField[];
}

/**
 * Order the array from `input` by `field` (a dotted path, or blank for the row
 * itself), comparing as `sortType`, writing the sorted array to `output`.
 */
export interface SortNode extends BaseNode {
  type: "sort";
  description: string;
  input: StateBinding;
  output: StateBinding;
  /** Dotted path to sort by (blank = the row itself). */
  field: string;
  direction: SortDirection;
  sortType: SortType;
}

/**
 * Combine two arrays (`left` from `input`, `right` from `rightInput`) on a key:
 * rows whose `leftKey` equals the other row's `rightKey` are merged
 * (right's fields spread over left's). `inner` drops unmatched left rows;
 * `left` keeps them. Result is written to `output`.
 */
export interface MergeNode extends BaseNode {
  type: "merge";
  description: string;
  /** Left (primary) array. */
  input: StateBinding;
  /** Right array to join against. */
  rightInput: StateBinding;
  output: StateBinding;
  /** Dotted path for the left join key. */
  leftKey: string;
  /** Dotted path for the right join key. */
  rightKey: string;
  joinKind: JoinKind;
}

/**
 * Interpolate `{{stateName}}` tokens in `template` against the shared state and
 * write the rendered string to `output`. The standalone version of the AI
 * node's prompt templating. Re-runs live on `change`.
 */
export interface TemplateNode extends BaseNode {
  type: "template";
  description: string;
  template: string;
  output: StateBinding;
}

/**
 * Run a regular expression (`pattern` + `flags`) over the string in `input`.
 * `test` writes "true"/"false"; `match` writes the first match (or full match
 * array with the `g` flag); `extract` writes the captured groups as an array;
 * `replace` writes the input with matches replaced by `replacement` (supports
 * `$1` group refs). Result goes to `output`.
 */
export interface RegexNode extends BaseNode {
  type: "regex";
  description: string;
  input: StateBinding;
  output: StateBinding;
  pattern: string;
  flags: string;
  mode: RegexMode;
  /** Replacement string for `replace` mode (supports `$1` group refs). */
  replacement: string;
}

/**
 * Pull a nested value out of the JSON in `input` using a dotted / bracketed
 * path (e.g. `data.items[0].name`), writing the resolved value to `output`.
 * A leading `$` is optional. Missing paths write an empty string.
 */
export interface JsonPathNode extends BaseNode {
  type: "jsonpath";
  description: string;
  input: StateBinding;
  output: StateBinding;
  /** Dotted / bracketed path (e.g. `data.items[0].name`). */
  path: string;
}

/**
 * Evaluate a math `expression` over the shared state and write the stringified
 * result to `output`. State slots are referenced by name as bare identifiers
 * (e.g. `price * qty + 1`). Evaluated by mathjs — the full function library,
 * units, and fractions are available; `import`/`createUnit` are disabled and
 * there is no JS eval.
 */
export interface MathNode extends BaseNode {
  type: "math";
  description: string;
  expression: string;
  output: StateBinding;
}

/** One required-field rule for the Schema Validate node. */
export interface SchemaRule {
  /** Stable id for list keying. */
  id: string;
  /** Dotted path that must be present. */
  field: string;
  /** Expected JS typeof (or `any`). */
  type: "any" | "string" | "number" | "boolean" | "object" | "array";
}

/**
 * Validate the JSON in `input` against `rules` (each a required field + type).
 * Writes "true"/"false" to `output`; on failure also writes the list of
 * problems to `errorOutput`. Use a downstream Filter / Code node to gate the
 * chain on the boolean.
 */
export interface SchemaValidateNode extends BaseNode {
  type: "schema_validate";
  description: string;
  input: StateBinding;
  /** State slot the boolean "true"/"false" result is written into. */
  output: StateBinding;
  /** State slot the newline-joined error list is written into. */
  errorOutput: StateBinding;
  rules: SchemaRule[];
}

/**
 * Transform the string in `input` with a single reversible/encoding
 * `operation` (base64 / URL encode-decode, or a one-way SHA-256 hex hash),
 * writing the result to `output`.
 */
export interface EncodeNode extends BaseNode {
  type: "encode";
  description: string;
  input: StateBinding;
  output: StateBinding;
  operation: EncodeOperation;
}

/**
 * Convert a tabular array held in `input` into a GitHub-Flavored Markdown
 * table and write the result into `output`. Accepts the same shapes as the
 * Table node — an array of objects (keys become headers) or an array of
 * arrays (first row becomes headers). Primitive arrays produce a single
 * `value` column.
 */
export interface CsvToMdNode extends BaseNode {
  type: "csv_to_md";
  description: string;
  /** State slot holding the tabular array to convert. */
  input: StateBinding;
  /** State slot the generated Markdown table is written into. */
  output: StateBinding;
}

/** What the Counter node tallies from its input. */
export type CounterMode =
  | "words"
  | "characters"
  | "characters_no_spaces"
  | "letters"
  | "uppercase"
  | "lowercase"
  | "digits"
  | "punctuation"
  | "whitespace"
  | "lines"
  | "sentences"
  | "paragraphs"
  | "avg_word_length"
  | "avg_sentence_length"
  | "longest_word"
  | "shortest_word"
  | "array_items"
  | "object_keys"
  | "unique_words";

/**
 * Count one or more metrics of the value held in `input` and write the results
 * to `output` as a `{ [mode]: number }` object. Each entry in `modes` is
 * tallied: text metrics (`words`, `characters`, `characters_no_spaces`,
 * `letters`, `lines`, `sentences`, `unique_words`) operate on the input coerced
 * to a string; structural metrics (`array_items`, `object_keys`) operate on the
 * input parsed as JSON/array. The preview shows every selected count live.
 * Runs synchronously in the chain and re-runs live as the input changes.
 */
export interface CounterNode extends BaseNode {
  type: "counter";
  fieldLabel: string;
  description: string;
  /** State slot holding the value to count. */
  input: StateBinding;
  /** State slot the `{ [mode]: number }` result object is written into. */
  output: StateBinding;
  /** Which metrics to tally (in display order). */
  modes: CounterMode[];
}

/** File formats the Download node can export state content as. */
export type DownloadFormat = "csv" | "png" | "jpeg" | "md" | "svg";

/**
 * Renders a download button in the preview. When clicked it reads the bound
 * state slot and exports its content as the chosen `format`:
 * `csv` (array via PapaParse or string), `md`/`svg` (plain text), or
 * `png`/`jpeg` (data URL from image upload or SVG string rendered to canvas).
 * The generated file is named `<fileName>.<format>`.
 */
export interface DownloadNode extends BaseNode {
  type: "download";
  fieldLabel: string;
  description: string;
  /** Label on the download button. */
  buttonText: string;
  /** State slot holding the content to export. */
  binding: StateBinding;
  /** Target file format. */
  format: DownloadFormat;
  /** Base file name (no extension). */
  fileName: string;
}

/** One key/value pair stored in a {@link VaultNode}. */
export interface VaultEntry {
  /** Stable id for list keying. */
  id: string;
  /** Object key written into the assembled vault object. */
  key: string;
  /** Literal value stored under `key`. */
  value: string;
}

/**
 * Key/value store rendered as a read-only "detail view" in the preview. The
 * author fills in {@link VaultEntry} pairs in the node editor; the runtime
 * assembles them into a `{ [key]: value }` object and writes it to the bound
 * state slot so downstream nodes (Template, HTTP headers, Code, …) can read it.
 * Each entry with a non-empty `key` contributes one property (later duplicate
 * keys win). When `masked` is on the preview hides every value behind dots with
 * a reveal toggle (handy for tokens / secrets); the stored object is unaffected.
 */
export interface VaultNode extends BaseNode {
  type: "vault";
  fieldLabel: string;
  description: string;
  /** State slot the assembled `{ [key]: value }` object is written into. */
  binding: StateBinding;
  /** The stored key/value pairs, in display order. */
  entries: VaultEntry[];
  /** Hide values behind dots in the preview detail view (reveal on demand). */
  masked: boolean;
}

/**
 * Synthetic-data generator built on faker.js. Produces an array of `count`
 * records shaped by a JSON `template` whose string values may embed `@token`
 * modifiers (e.g. `"@firstName"`, `"@email"`, or a mixed `"@firstName @lastName"`).
 * Each `@token` resolves to a fresh faker value per record; a value that is
 * exactly one token keeps the generated native type (number / boolean), while
 * a mixed string interpolates each token as text. Generation is deterministic
 * for a given `seed` — bumping the seed (the editor's "Regenerate") yields a
 * different but reproducible dataset. The assembled array is written to the
 * bound state slot so downstream nodes (Table, Filter, JSON, …) can consume it.
 */
export interface IdentityNode extends BaseNode {
  type: "identity";
  /** Heading shown above the preview. Blank = omit. */
  fieldLabel: string;
  description: string;
  /** How many records to generate (clamped to a sane upper bound at runtime). */
  count: number;
  /**
   * The record shape as a JSON string. String values may contain `@token`
   * modifiers replaced per record with faker-generated values. Invalid JSON
   * generates nothing.
   */
  template: string;
  /** Deterministic faker seed; changing it regenerates the dataset. */
  seed: number;
  /** State slot the generated array of records is written into. */
  binding: StateBinding;
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

/**
 * Call a Gemini / OpenRouter model with a prompt template (supports
 * `{{stateName}}` interpolation) and write the reply into `output` state.
 */
export interface AiNode extends BaseNode {
  type: "ai";
  provider: AiProvider;
  /** Model id (e.g. `gemini-2.5-flash`, `openrouter/auto`). */
  model: string;
  /** Prompt body. Supports `{{state}}` interpolation. */
  prompt: string;
  /** State slot the model reply is written into. */
  output: StateBinding;
  /** Render the reply as Markdown in the preview. */
  markdownOutput?: boolean;
}

/**
 * Excel (.xlsx / .xls) file input — the spreadsheet sibling of the CSV node.
 * The end user uploads a workbook; the chosen sheet is parsed client-side
 * (SheetJS) into an optimized data array (empty rows/columns dropped, cells
 * typed) and the parsed array — not the raw file — is written to the bound
 * state slot. With `hasHeader` rows become objects keyed by column name;
 * without, positional `unknown[][]` rows.
 */
export interface XlsxNode extends BaseNode {
  type: "xlsx";
  fieldLabel: string;
  description: string;
  binding: StateBinding;
  /** Treat the first row as column names (rows become keyed objects). */
  hasHeader: boolean;
  /** Worksheet name to read. Blank = the workbook's first sheet. */
  sheet: string;
}

/** One aggregate output column for the {@link AggregateNode}. */
export interface AggregateRule {
  /** Stable id for list keying. */
  id: string;
  /** Reducer applied over each group. */
  op: AggregateOp;
  /** Source column the reducer reads (ignored for `count`). */
  field: string;
  /** Output column name (blank = `<op>_<field>`). */
  as: string;
}

/**
 * Group an array of rows by zero or more columns and reduce each group to
 * aggregate columns (count / sum / mean / median / mode / min / max /
 * distinct / stdev / variance) with Arquero. Reads the array from `input` and writes
 * the grouped result array to `output`. With no `groupBy` columns it reduces
 * the whole array to a single summary row. Runs in the chain like a transform
 * node and re-runs live as the input changes.
 */
export interface AggregateNode extends BaseNode {
  type: "aggregate";
  description: string;
  /** State slot holding the source array. */
  input: StateBinding;
  /** State slot the grouped result array is written into. */
  output: StateBinding;
  /** Top-level column names to group by (empty = one summary row). */
  groupBy: string[];
  /** The aggregate columns to compute per group. */
  aggregations: AggregateRule[];
}

/**
 * Mermaid diagram viewer (preview-only). Reads a Mermaid definition string
 * (flowchart, sequence, gantt, pie, class, …) from the bound state slot and
 * renders it to an SVG diagram in the live preview. Invalid syntax shows an
 * inline error; the node never writes to state.
 */
export interface MermaidNode extends BaseNode {
  type: "mermaid";
  fieldLabel: string;
  description: string;
  /** State slot holding the Mermaid definition source string. */
  binding: StateBinding;
  /** Diagram color theme. */
  theme: MermaidTheme;
}

/**
 * Syntax-highlighted code viewer (preview-only). Reads a code string from the
 * bound state slot and renders it as a richly highlighted, read-only code block
 * with Shiki (the VS Code engine). Pick the source language and color theme.
 * The node never writes to state.
 */
export interface HighlightNode extends BaseNode {
  type: "highlight";
  fieldLabel: string;
  description: string;
  /** State slot holding the code source to highlight. */
  binding: StateBinding;
  /** Source language — drives tokenization. */
  language: CodeInputLanguage;
  /** Shiki color theme. */
  theme: HighlightTheme;
  /** Render a gutter of line numbers. */
  lineNumbers: boolean;
}

/**
 * QR code generator (preview-only). Encodes the string in the bound state slot
 * as a QR code rendered to crisp SVG at the chosen module `size` and
 * error-correction `level`. Empty input shows a placeholder; the node never
 * writes to state.
 */
export interface QrCodeNode extends BaseNode {
  type: "qrcode";
  fieldLabel: string;
  description: string;
  /** State slot holding the text / URL to encode. */
  binding: StateBinding;
  /** Rendered SVG size in px (square). */
  size: number;
  /** Error-correction level. */
  level: QrLevel;
}

/**
 * Text-to-speech player (preview-only). Reads a string from the bound state
 * slot and speaks it aloud with the browser Speech Synthesis engine (via
 * `react-text-to-speech`). The author tunes `rate`, `pitch`, and `volume`; the
 * preview renders play / pause / stop controls and, when `highlight` is on,
 * highlights each word as it is spoken. Empty input shows a placeholder; the
 * node never writes to state.
 */
export interface TtsNode extends BaseNode {
  type: "tts";
  fieldLabel: string;
  description: string;
  /** State slot holding the text to speak. */
  binding: StateBinding;
  /** Speaking rate (0.5 slow – 2 fast). */
  rate: number;
  /** Voice pitch (0 low – 2 high). */
  pitch: number;
  /** Playback volume (0 muted – 1 full). */
  volume: number;
  /** Highlight each word in the preview as it is spoken. */
  highlight: boolean;
}

/**
 * Speech-to-text input (preview-only capture). Listens to the microphone with
 * the browser Speech Recognition engine (via `react-speech-recognition`) and
 * writes the live transcript into the bound state slot, so downstream nodes
 * (AI, Template, Code, …) can consume the dictated text. Renders a record /
 * stop control plus the running transcript. Browsers without Speech Recognition
 * support show an inline notice.
 */
export interface SttNode extends BaseNode {
  type: "stt";
  fieldLabel: string;
  description: string;
  /** State slot the recognized transcript is written into. */
  binding: StateBinding;
  /** BCP-47 language tag to recognize (e.g. `en-US`, `my-MM`). */
  lang: string;
  /** Keep listening after a pause (vs. stopping on the first silence). */
  continuous: boolean;
}

/** Union of every concrete node kind. */
export type ToolNode =
  | StateNode
  | TextRunNode
  | ButtonNode
  | NumberNode
  | SelectNode
  | ToggleNode
  | DateNode
  | FileNode
  | ImageNode
  | TextareaNode
  | MarkdownNode
  | JsonNode
  | CsvNode
  | TableNode
  | ChartNode
  | SpriteNode
  | CodeInputNode
  | ViewportNode
  | ConvertHtmlNode
  | ThemedNode
  | HtmlSanitizeNode
  | CodeNode
  | TsTypeNode
  | HttpRequestNode
  | PlaywrightScrapeNode
  | FilterNode
  | MapNode
  | SortNode
  | MergeNode
  | TemplateNode
  | RegexNode
  | JsonPathNode
  | MathNode
  | SchemaValidateNode
  | EncodeNode
  | CsvToMdNode
  | CounterNode
  | DownloadNode
  | VaultNode
  | IdentityNode
  | XlsxNode
  | AggregateNode
  | MermaidNode
  | HighlightNode
  | QrCodeNode
  | TtsNode
  | SttNode
  | AiNode;

/** A named, ordered chain of nodes. */
export interface Tool {
  id: string;
  name: string;
  /**
   * Optional sidebar icon as a raw SVG markup string. Always re-sanitized
   * (`sanitizeSvgIcon`) before it is rendered. Absent/blank ⇒ the UI shows a
   * default glyph. Edited by hand or AI-generated from the tool's node chain
   * via the tool options menu.
   */
  icon?: string;
  nodes: ToolNode[];
}

/**
 * One node in a chat-assistant build spec: the node type plus a partial config
 * patch merged over the type's defaults. Internal ids are never supplied — they
 * are generated when the spec is applied.
 */
export interface BuildSpecNode {
  /** Node kind to create. */
  type: ToolNodeType;
  /** Partial config merged over {@link createNode}'s defaults (no id/type). */
  config?: Record<string, unknown>;
  /**
   * Optional local label the model assigns so other nodes can target this one
   * (a Button/Text `targets` or `resetTargets` entry). Resolved to the node's
   * generated id when applied, then discarded — it is never a node field.
   */
  ref?: string;
}

/**
 * A complete tool the chat assistant emits in ONE reply (no incremental tool
 * calls): the shared-state slots plus the ordered node chain. Applying it
 * rebuilds the open tool's nodes atomically — the spec IS the resulting state.
 */
export interface BuildSpec {
  /** Optional tool name (ignored when blank). */
  name?: string;
  /** Shared-state slots the State Control is built from. */
  slots: { name: string; value?: string }[];
  /** Ordered nodes, top-to-bottom (excluding the State Control). */
  nodes: BuildSpecNode[];
}

/** Nodes that produce visible output in the preview. */
export type RenderNode =
  | TextRunNode
  | ButtonNode
  | NumberNode
  | SelectNode
  | ToggleNode
  | DateNode
  | FileNode
  | ImageNode
  | TextareaNode
  | MarkdownNode
  | JsonNode
  | CsvNode
  | TableNode
  | ChartNode
  | SpriteNode
  | CodeInputNode
  | ViewportNode
  | ConvertHtmlNode
  | ThemedNode
  | CounterNode
  | DownloadNode
  | VaultNode
  | IdentityNode
  | XlsxNode
  | MermaidNode
  | HighlightNode
  | QrCodeNode
  | TtsNode
  | SttNode;

/** Node kinds that produce visible output in the preview. */
export const RENDER_NODE_TYPES: ReadonlySet<ToolNodeType> =
  new Set<ToolNodeType>([
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
    "chart",
    "sprite",
    "code_input",
    "viewport",
    "convert_html",
    "themed",
    "counter",
    "download",
    "vault",
    "identity",
    "xlsx",
    "mermaid",
    "highlight",
    "qrcode",
    "tts",
    "stt",
  ]);

/** Type guard: does this node render in the preview? */
export const isRenderNode = (n: ToolNode): n is RenderNode =>
  RENDER_NODE_TYPES.has(n.type);
