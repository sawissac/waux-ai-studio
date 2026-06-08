/**
 * Pure preview-runtime helpers shared by the canvas node cards and the live
 * Preview pane. No React, no Redux — just resolve bindings and execute the
 * code-node chain over a plain `{ [stateName]: string }` map.
 */
import { aiHelpers, callGemini, callOpenRouter } from "@/lib/ai-providers";
import type {
  AiNode,
  StateBinding,
  StateNode,
  Tool,
  ToolNode,
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

const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor;

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
  if (!outName) {return;}

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
 * Run every code & AI node in `tool` top-to-bottom against a copy of `current`.
 *
 * Code bodies define `async function run(state, ai) { ... }` — `ai` exposes
 * `gemini` / `openrouter` helpers. AI nodes interpolate `{{stateName}}` tokens
 * in their prompt and write the model reply into their output binding. Author
 * errors are swallowed so a bad node can't crash the preview.
 *
 * @param tool - The tool whose nodes should execute.
 * @param current - The pre-run state map.
 * @param stateNode - The tool's state node (for AI output binding resolution).
 * @returns A new state map reflecting all writes.
 */
export async function runChain(
  tool: Tool,
  current: StateMap,
  stateNode: StateNode | null = null,
  onError?: (message: string) => void,
): Promise<StateMap> {
  const next: StateMap = { ...current };
  const shim = {
    get: (k: string) => next[k],
    set: (k: string, v: any) => {
      next[k] = v;
    },
  };

  for (const node of tool.nodes) {
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
 * @returns A new state map reflecting all `state.set(...)` writes during reset.
 */
export async function resetChain(
  tool: Tool,
  current: StateMap,
): Promise<StateMap> {
  const next: StateMap = { ...current };
  const shim = {
    get: (k: string) => next[k],
    set: (k: string, v: any) => {
      next[k] = v;
    },
  };

  for (const node of tool.nodes) {
    if (node.type !== "code") {
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
 * @param tool - The tool whose code nodes should execute.
 * @param current - The pre-change state map.
 * @returns A new state map reflecting all `state.set(...)` writes during change.
 */
export async function changeChain(
  tool: Tool,
  current: StateMap,
): Promise<StateMap> {
  const next: StateMap = { ...current };
  const shim = {
    get: (k: string) => next[k],
    set: (k: string, v: any) => {
      next[k] = v;
    },
  };

  for (const node of tool.nodes) {
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
      console.error(
        `[ToolBuilder] code node "${node.id}" change() failed:`,
        err instanceof Error ? (err.stack ?? err.message) : err,
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
      return {
        label: "Using State",
        value: resolveBinding(node.binding, stateNode),
      };
    case "canvas":
      return { label: "ID", value: node.elementId };
    case "code":
      return null;
    case "ai":
      return {
        label: node.provider === "openrouter" ? "OpenRouter" : "Gemini",
        value: node.model || "default",
      };
  }
}
