/**
 * Pure preview-runtime helpers shared by the canvas node cards and the live
 * Preview pane. No React, no Redux — just resolve bindings and execute the
 * code-node chain over a plain `{ [stateName]: string }` map.
 */
import { buildAiNodeSystemPrompt } from "@/constants/ai-prompts";
import { aiHelpers, callGemini, callOpenRouter } from "@/lib/ai-providers";
import { sanitizeHtmlDoc } from "@/lib/html-sanitize";
import { httpRequest } from "@/lib/http-request";
import { jsonToTs } from "@/lib/json-to-ts";
import {
  asArray,
  asJson,
  checkSchemaRule,
  compareFilter,
  compareSort,
  evalExpression,
  getPath,
} from "@/lib/transform";
import type {
  AiNode,
  EncodeNode,
  FilterNode,
  HtmlSanitizeNode,
  HttpRequestNode,
  JsonPathNode,
  MapNode,
  MathNode,
  MergeNode,
  RegexNode,
  SchemaValidateNode,
  SortNode,
  StateBinding,
  StateNode,
  TemplateNode,
  Tool,
  ToolNode,
  TsTypeNode,
} from "@/types/tool-builder";

/** A flat snapshot of the shared state store keyed by state name. */
export type StateMap = Record<string, any>;

/**
 * Resolve a node's {@link StateBinding} to a concrete state name.
 *
 * @param binding - The node's binding (by name or positional index).
 * @param stateNode - The tool's state node, or `null` if none exists.
 * @returns The bound state name, or `""` when it can't be resolved.
 */
export function resolveBinding(
  binding: StateBinding | undefined,
  stateNode: StateNode | null,
): string {
  if (!binding) {
    return "";
  }
  if (binding.mode === "index") {
    const i = Number(binding.value);
    return stateNode?.states[i]?.name ?? "";
  }
  return binding.value;
}

/** Seed a state map from the tool's state-node defaults. */
export function initialStateMap(stateNode: StateNode | null): StateMap {
  const map: StateMap = {};
  for (const s of stateNode?.states ?? []) {
    map[s.name] = s.value;
  }
  return map;
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/**
 * Build the `state` shim handed to code-node `run` / `change` / `reset`
 * functions. Reads & writes go straight to `next`; `copyToClipboard` copies a
 * string to the user's clipboard (browser-only, best-effort) and resolves
 * `true` on success.
 */
function makeStateShim(next: StateMap) {
  return {
    get: (k: string) => next[k],
    set: (k: string, v: any) => {
      next[k] = v;
    },
    copyToClipboard: async (text: string): Promise<boolean> => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(String(text ?? ""));
          return true;
        }
      } catch {
        // Clipboard API unavailable or write rejected (e.g. no user gesture).
      }
      return false;
    },
  };
}

/** Replace `{{name}}` tokens in `template` with values from `state`. */
function interpolate(template: string, state: StateMap): string {
  return template.replace(/\{\{\s*([\w$]+)\s*\}\}/g, (_, key) => {
    const v = state[key];
    return v == null ? "" : String(v);
  });
}

/** Run a single AI node against `state`, writing the reply to its output binding. */
async function runAiNode(
  node: AiNode,
  state: StateMap,
  stateNode: StateNode | null,
): Promise<void> {
  const promptText = interpolate(node.prompt ?? "", state);
  // Auto-built, state-aware system instruction (mirrors the code-editor Ask AI
  // panel) — lists the tool's slots with their current values so the model can
  // reason about real state. Not interpolated: its literal {{name}} hints must
  // survive verbatim.
  const slots = (stateNode?.states ?? []).map((s) => {
    const current = state[s.name];
    return {
      name: s.name,
      value: current == null ? s.value : String(current),
    };
  });
  const systemText = buildAiNodeSystemPrompt(slots);
  const outName = resolveBinding(node.output, stateNode);
  if (!outName) {
    return;
  }

  const opts = {
    prompt: promptText,
    model: node.model || undefined,
    systemInstruction: systemText,
  };
  const reply =
    node.provider === "openrouter"
      ? await callOpenRouter(opts)
      : await callGemini(opts);
  state[outName] = reply;
}

/**
 * Run a single TS Type Converter node against `state`: read the JSON source
 * from its input binding, generate TypeScript declarations, and write them to
 * its output binding. Throws on invalid JSON (caller decides how to surface).
 */
function runTsTypeNode(
  node: TsTypeNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const raw = state[inName];
  // Code nodes may have stored a parsed object — re-serialize it.
  const source =
    typeof raw === "string"
      ? raw
      : raw === null || raw === undefined
        ? ""
        : JSON.stringify(raw);
  if (!source.trim()) {
    state[outName] = "";
    return;
  }
  state[outName] = jsonToTs(source, node.rootName || "Root");
}

/**
 * Run a single HTML Sanitize node against `state`: read raw HTML from its
 * input binding, sanitize it, and write the cleaned markup to its output
 * binding. Non-string input is coerced; empty input clears the output.
 */
function runHtmlSanitizeNode(
  node: HtmlSanitizeNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const raw = state[inName];
  const source = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  state[outName] = sanitizeHtmlDoc(source, node.allowStyles, node.allowImages);
}

/** Stringify a value for writing back to the flat state map. */
function toStateValue(value: unknown): unknown {
  // Arrays/objects stay structured (Table/Filter/etc. read them directly);
  // primitives stringify so the bound input editors render them.
  if (value === null || value === undefined) {
    return "";
  }
  return value;
}

/** Run an HTTP Request node, writing the parsed response to its output. */
async function runHttpRequestNode(
  node: HttpRequestNode,
  state: StateMap,
  stateNode: StateNode | null,
): Promise<void> {
  const outName = resolveBinding(node.output, stateNode);
  if (!outName) {
    return;
  }
  // A bound `input` slot is exposed as the `{{input}}` token, usable in the
  // URL, header values, and body alongside any other `{{stateName}}`.
  const inName = resolveBinding(node.input, stateNode);
  const interpState: StateMap = inName
    ? { ...state, input: state[inName] }
    : state;
  const headers: Record<string, string> = {};
  for (const h of node.headers ?? []) {
    if (h.key.trim()) {
      headers[h.key.trim()] = interpolate(h.value ?? "", interpState);
    }
  }
  const result = await httpRequest(
    {
      method: node.method,
      url: interpolate(node.url ?? "", interpState),
      headers,
      body: node.body ? interpolate(node.body, interpState) : undefined,
    },
    node.responseType,
  );
  state[outName] = toStateValue(result.body);
}

/** Run a Filter node: keep rows whose field satisfies the operator. */
function runFilterNode(
  node: FilterNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const rows = asArray(state[inName]);
  state[outName] = rows.filter((row) =>
    compareFilter(
      node.field ? getPath(row, node.field) : row,
      node.operator,
      node.value,
    ),
  );
}

/** Run a Map node: project each row into a new object from the field mapping. */
function runMapNode(
  node: MapNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const rows = asArray(state[inName]);
  state[outName] = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const f of node.fields ?? []) {
      if (f.to.trim()) {
        out[f.to] = f.from ? getPath(row, f.from) : row;
      }
    }
    return out;
  });
}

/** Run a Sort node: order the array by a field as the chosen type. */
function runSortNode(
  node: SortNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const rows = [...asArray(state[inName])];
  rows.sort((a, b) => {
    const cmp = compareSort(
      node.field ? getPath(a, node.field) : a,
      node.field ? getPath(b, node.field) : b,
      node.sortType,
    );
    return node.direction === "desc" ? -cmp : cmp;
  });
  state[outName] = rows;
}

/** Run a Merge / Join node: combine two arrays on a key. */
function runMergeNode(
  node: MergeNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const rightName = resolveBinding(node.rightInput, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !rightName || !outName) {
    return;
  }
  const left = asArray(state[inName]);
  const right = asArray(state[rightName]);
  // Index the right side by its join key for O(n+m) lookups.
  const rightByKey = new Map<string, unknown>();
  for (const r of right) {
    rightByKey.set(String(getPath(r, node.rightKey)), r);
  }
  const out: unknown[] = [];
  for (const l of left) {
    const match = rightByKey.get(String(getPath(l, node.leftKey)));
    if (match !== undefined) {
      out.push({
        ...(l as Record<string, unknown>),
        ...(match as Record<string, unknown>),
      });
    } else if (node.joinKind === "left") {
      out.push(l);
    }
  }
  state[outName] = out;
}

/** Run a Template node: interpolate `{{name}}` tokens into the template. */
function runTemplateNode(
  node: TemplateNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const outName = resolveBinding(node.output, stateNode);
  if (!outName) {
    return;
  }
  state[outName] = interpolate(node.template ?? "", state);
}

/** Run a Regex node: test / match / extract / replace over the input string. */
function runRegexNode(
  node: RegexNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName || !node.pattern) {
    return;
  }
  const source = String(state[inName] ?? "");
  const re = new RegExp(node.pattern, node.flags || undefined);
  if (node.mode === "test") {
    state[outName] = String(re.test(source));
    return;
  }
  if (node.mode === "replace") {
    state[outName] = source.replace(re, node.replacement ?? "");
    return;
  }
  if (node.mode === "extract") {
    const m = re.exec(source);
    state[outName] = m ? m.slice(1) : [];
    return;
  }
  // match
  if (re.global) {
    state[outName] = source.match(re) ?? [];
  } else {
    const m = re.exec(source);
    state[outName] = m ? m[0] : "";
  }
}

/** Run a JSONPath node: resolve a dotted/bracketed path on the input JSON. */
function runJsonPathNode(
  node: JsonPathNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const root = asJson(state[inName]);
  const value = getPath(root, node.path);
  state[outName] = toStateValue(value);
}

/** Run a Math node: evaluate the expression over numeric state variables. */
function runMathNode(
  node: MathNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const outName = resolveBinding(node.output, stateNode);
  if (!outName || !node.expression.trim()) {
    return;
  }
  state[outName] = evalExpression(node.expression, state);
}

/** Run a Schema Validate node: write a boolean + error list for the input JSON. */
function runSchemaValidateNode(
  node: SchemaValidateNode,
  state: StateMap,
  stateNode: StateNode | null,
): void {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const root = asJson(state[inName]);
  const errors: string[] = [];
  for (const rule of node.rules ?? []) {
    const err = checkSchemaRule(root, rule);
    if (err) {
      errors.push(err);
    }
  }
  state[outName] = String(errors.length === 0);
  const errName = resolveBinding(node.errorOutput, stateNode);
  if (errName) {
    state[errName] = errors.join("\n");
  }
}

/** Run an Encode / Decode node (async — SHA-256 uses SubtleCrypto). */
async function runEncodeNode(
  node: EncodeNode,
  state: StateMap,
  stateNode: StateNode | null,
): Promise<void> {
  const inName = resolveBinding(node.input, stateNode);
  const outName = resolveBinding(node.output, stateNode);
  if (!inName || !outName) {
    return;
  }
  const source = String(state[inName] ?? "");
  switch (node.operation) {
    case "base64_encode":
      state[outName] = btoa(unescape(encodeURIComponent(source)));
      break;
    case "base64_decode":
      try {
        state[outName] = decodeURIComponent(escape(atob(source)));
      } catch {
        state[outName] = "";
      }
      break;
    case "url_encode":
      state[outName] = encodeURIComponent(source);
      break;
    case "url_decode":
      try {
        state[outName] = decodeURIComponent(source);
      } catch {
        state[outName] = source;
      }
      break;
    case "hash_sha256": {
      const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(source),
      );
      state[outName] = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      break;
    }
  }
}

/**
 * Run the synchronous transform nodes (everything except code, ai,
 * http_request, encode — those are async and handled by their callers). Pure,
 * so both {@link runChain} and {@link changeChain} share it for live preview.
 * Returns true when `node` was a sync transform it handled.
 */
function runSyncTransform(
  node: ToolNode,
  state: StateMap,
  stateNode: StateNode | null,
): boolean {
  switch (node.type) {
    case "ts_type":
      runTsTypeNode(node, state, stateNode);
      return true;
    case "html_sanitize":
      runHtmlSanitizeNode(node, state, stateNode);
      return true;
    case "filter":
      runFilterNode(node, state, stateNode);
      return true;
    case "map":
      runMapNode(node, state, stateNode);
      return true;
    case "sort":
      runSortNode(node, state, stateNode);
      return true;
    case "merge":
      runMergeNode(node, state, stateNode);
      return true;
    case "template":
      runTemplateNode(node, state, stateNode);
      return true;
    case "regex":
      runRegexNode(node, state, stateNode);
      return true;
    case "jsonpath":
      runJsonPathNode(node, state, stateNode);
      return true;
    case "math":
      runMathNode(node, state, stateNode);
      return true;
    case "schema_validate":
      runSchemaValidateNode(node, state, stateNode);
      return true;
    default:
      return false;
  }
}

/**
 * Run every code & AI node in `tool` top-to-bottom against a copy of `current`.
 *
 * Code bodies define `async function run(state, ai) { ... }` — `state` exposes
 * `get` / `set` / `copyToClipboard`, `ai` exposes `gemini` / `openrouter`
 * helpers. AI nodes interpolate `{{stateName}}` tokens
 * in their prompt and write the model reply into their output binding. Author
 * errors are swallowed so a bad node can't crash the preview.
 *
 * @param tool - The tool whose nodes should execute.
 * @param current - The pre-run state map.
 * @param stateNode - The tool's state node (for AI output binding resolution).
 * @param onError - Surface author/runtime errors without crashing the preview.
 * @param targetIds - When non-empty, run only these code/AI node ids (still in
 *   chain order); empty/omitted runs every code & AI node.
 * @returns A new state map reflecting all writes.
 */
export async function runChain(
  tool: Tool,
  current: StateMap,
  stateNode: StateNode | null = null,
  onError?: (message: string) => void,
  targetIds?: string[],
): Promise<StateMap> {
  const next: StateMap = { ...current };
  const shim = makeStateShim(next);

  const only = targetIds && targetIds.length > 0 ? new Set(targetIds) : null;

  for (const node of tool.nodes) {
    if (only && !only.has(node.id)) {
      continue;
    }
    if (node.type === "code") {
      try {
        const fn = new AsyncFunction(
          "state",
          "ai",
          `${node.code}\n;if (typeof run === "function") { return await run(state, ai); }`,
        );
        await fn(shim, aiHelpers);
      } catch (err) {
        // Author error — surface to console, keep the preview alive.
        const msg =
          err instanceof Error ? (err.stack ?? err.message) : String(err);
        console.error(
          `[ToolBuilder] code node "${node.id}" run() failed:`,
          msg,
        );
        onError?.(err instanceof Error ? err.message : String(err));
      }
    } else if (node.type === "ai") {
      try {
        await runAiNode(node, next, stateNode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[ToolBuilder] ai node "${node.id}" (${node.provider}) failed:`,
          err instanceof Error ? (err.stack ?? err.message) : err,
        );
        onError?.(msg);
      }
    } else if (node.type === "http_request") {
      try {
        await runHttpRequestNode(node, next, stateNode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[ToolBuilder] http_request node "${node.id}" failed:`,
          msg,
        );
        onError?.(msg);
      }
    } else if (node.type === "encode") {
      try {
        await runEncodeNode(node, next, stateNode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ToolBuilder] encode node "${node.id}" failed:`, msg);
        onError?.(msg);
      }
    } else {
      // ts_type, html_sanitize, filter, map, sort, merge, template, regex,
      // jsonpath, math, schema_validate — pure synchronous transforms.
      try {
        runSyncTransform(node, next, stateNode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[ToolBuilder] ${node.type} node "${node.id}" failed:`,
          msg,
        );
        onError?.(msg);
      }
    }
  }
  return next;
}

/**
 * Run every code node in `tool` top-to-bottom against a copy of `current`,
 * looking for an `async function reset(state) { ... }` definition.
 *
 * @param tool - The tool whose code nodes should execute.
 * @param current - The pre-reset state map.
 * @param targetIds - When non-empty, reset only these code node ids (still in
 *   chain order); empty/omitted resets every code node.
 * @returns A new state map reflecting all `state.set(...)` writes during reset.
 */
export async function resetChain(
  tool: Tool,
  current: StateMap,
  targetIds?: string[],
): Promise<StateMap> {
  const next: StateMap = { ...current };
  const shim = makeStateShim(next);

  const only = targetIds && targetIds.length > 0 ? new Set(targetIds) : null;

  for (const node of tool.nodes) {
    if (node.type !== "code") {
      continue;
    }
    if (only && !only.has(node.id)) {
      continue;
    }
    try {
      const fn = new AsyncFunction(
        "state",
        "ai",
        `${node.code}\n;if (typeof reset === "function") { return await reset(state, ai); }`,
      );
      await fn(shim, aiHelpers);
    } catch (err) {
      console.error(
        `[ToolBuilder] code node "${node.id}" reset() failed:`,
        err instanceof Error ? (err.stack ?? err.message) : err,
      );
    }
  }
  return next;
}

/**
 * Run every code node in `tool` top-to-bottom against a copy of `current`,
 * looking for an `async function change(state) { ... }` definition.
 *
 * TS Type Converter nodes also re-run here so their output tracks the bound
 * JSON input live (invalid/partial JSON is skipped silently).
 *
 * @param tool - The tool whose code nodes should execute.
 * @param current - The pre-change state map.
 * @param stateNode - The tool's state node (for ts_type binding resolution).
 * @returns A new state map reflecting all `state.set(...)` writes during change.
 */
export async function changeChain(
  tool: Tool,
  current: StateMap,
  stateNode: StateNode | null = null,
): Promise<StateMap> {
  const next: StateMap = { ...current };
  const shim = makeStateShim(next);

  for (const node of tool.nodes) {
    if (node.type === "encode") {
      // Local re-encode as the bound input changes (cheap; no network).
      try {
        await runEncodeNode(node, next, stateNode);
      } catch {
        // Keep the previous output on an unexpected error.
      }
      continue;
    }
    // Pure sync transforms re-run live so their output tracks bound inputs as
    // they're typed (partial/invalid input keeps the previous output).
    // HTTP requests are intentionally excluded — they only fire on a run.
    try {
      if (runSyncTransform(node, next, stateNode)) {
        continue;
      }
    } catch {
      // Partially-typed input; keep the previous output.
      continue;
    }
    if (node.type !== "code") {
      continue;
    }
    try {
      const fn = new AsyncFunction(
        "state",
        "ai",
        `${node.code}\n;if (typeof change === "function") { return await change(state, ai); }`,
      );
      await fn(shim, aiHelpers);
    } catch (err) {
      console.warn(
        `[ToolBuilder] code node "${node.id}" change() failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return next;
}

export type NodeSubtitle = { label: string; value?: string | number } | null;

/** Node-card subtitle text (the mono line under the title). */
export function nodeSubtitle(
  node: ToolNode,
  stateNode: StateNode | null,
): NodeSubtitle {
  switch (node.type) {
    case "state":
      return { label: "Available State", value: node.states.length };
    case "text_run":
    case "number":
    case "select":
    case "toggle":
    case "date":
    case "file":
    case "image":
    case "textarea":
    case "markdown":
    case "json":
    case "csv":
    case "table":
    case "code_input":
      return {
        label: "Using State",
        value: resolveBinding(node.binding, stateNode),
      };
    case "button":
      return {
        label: "Action",
        value: node.resetEnabled
          ? `${node.buttonText} / ${node.resetText}`
          : node.buttonText,
      };
    case "canvas":
      return { label: "ID", value: node.elementId };
    case "viewport": {
      const bound = resolveBinding(node.binding, stateNode);
      return {
        label: "URL",
        value: node.url.trim() || (bound ? `{{${bound}}}` : "—"),
      };
    }
    case "convert_html":
      return {
        label: "HTML →",
        value: resolveBinding(node.binding, stateNode) || "—",
      };
    case "themed":
      return {
        label: "Recolors",
        value: resolveBinding(node.binding, stateNode) || "—",
      };
    case "code":
      return node.description ? { label: node.description } : null;
    case "ts_type":
      return {
        label: "JSON → TS",
        value: `${resolveBinding(node.input, stateNode) || "?"} → ${resolveBinding(node.output, stateNode) || "?"}`,
      };
    case "html_sanitize":
      return {
        label: "Sanitize",
        value: `${resolveBinding(node.input, stateNode) || "?"} → ${resolveBinding(node.output, stateNode) || "?"}`,
      };
    case "http_request":
      return { label: node.method, value: node.url || "—" };
    case "filter":
      return {
        label: "Filter",
        value: `${node.field || "row"} ${node.operator}`,
      };
    case "map":
      return { label: "Map", value: `${node.fields.length} fields` };
    case "sort":
      return {
        label: "Sort",
        value: `${node.field || "row"} ${node.direction}`,
      };
    case "merge":
      return {
        label: "Join",
        value: `${node.leftKey} = ${node.rightKey} (${node.joinKind})`,
      };
    case "template":
      return {
        label: "Template →",
        value: resolveBinding(node.output, stateNode) || "—",
      };
    case "regex":
      return { label: "Regex", value: node.pattern || "—" };
    case "jsonpath":
      return { label: "Query", value: node.path || "—" };
    case "math":
      return { label: "Math", value: node.expression || "—" };
    case "schema_validate":
      return {
        label: "Validate",
        value: `${node.rules.length} rules → ${resolveBinding(node.output, stateNode) || "?"}`,
      };
    case "encode":
      return { label: "Encode", value: node.operation };
    case "ai":
      return {
        label: node.provider === "openrouter" ? "OpenRouter" : "Gemini",
        value: node.model || "default",
      };
  }
}
