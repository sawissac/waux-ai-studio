/**
 * Pure preview-runtime helpers shared by the canvas node cards and the live
 * Preview pane. No React, no Redux — just resolve bindings and execute the
 * code-node chain over a plain `{ [stateName]: string }` map.
 */
import { aiHelpers, callGemini, callOpenRouter } from "@/lib/ai-providers";
import { sanitizeHtmlDoc } from "@/lib/html-sanitize";
import { jsonToTs } from "@/lib/json-to-ts";
import type {
  AiNode,
  HtmlSanitizeNode,
  StateBinding,
  StateNode,
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
  const systemText = node.systemInstruction
    ? interpolate(node.systemInstruction, state)
    : undefined;
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
    } else if (node.type === "ts_type") {
      try {
        runTsTypeNode(node, next, stateNode);
      } catch (err) {
        // Invalid JSON in the bound input — surface, keep the preview alive.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ToolBuilder] ts_type node "${node.id}" failed:`, msg);
        onError?.(msg);
      }
    } else if (node.type === "html_sanitize") {
      try {
        runHtmlSanitizeNode(node, next, stateNode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[ToolBuilder] html_sanitize node "${node.id}" failed:`,
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
    if (node.type === "ts_type") {
      // Live conversion while typing — silently skip until the JSON parses.
      try {
        runTsTypeNode(node, next, stateNode);
      } catch {
        // Partially-typed JSON; keep the previous output.
      }
      continue;
    }
    if (node.type === "html_sanitize") {
      // Live re-sanitize as the bound HTML changes.
      try {
        runHtmlSanitizeNode(node, next, stateNode);
      } catch {
        // Keep the previous output on an unexpected sanitizer error.
      }
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
    case "ai":
      return {
        label: node.provider === "openrouter" ? "OpenRouter" : "Gemini",
        value: node.model || "default",
      };
  }
}
