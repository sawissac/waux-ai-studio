/**
 * Pure preview-runtime helpers shared by the canvas node cards and the live
 * Preview pane. No React, no Redux — just resolve bindings and execute the
 * code-node chain over a plain `{ [stateName]: string }` map.
 */
import type {
  StateBinding,
  StateNode,
  Tool,
  ToolNode,
} from "@/types/tool-builder";

/** A flat snapshot of the shared state store keyed by state name. */
export type StateMap = Record<string, string>;

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

/**
 * Run every code node in `tool` top-to-bottom against a copy of `current`.
 *
 * Each code body is expected to define `function run(state) { ... }`; it is
 * invoked with a `{ get, set }` shim over the working copy. Author code is
 * sandboxed only by `new Function` (no DOM/closure access to app internals);
 * failures are swallowed so a bad node can't crash the preview.
 *
 * @param tool - The tool whose code nodes should execute.
 * @param current - The pre-run state map.
 * @returns A new state map reflecting all `state.set(...)` writes.
 */
export function runChain(tool: Tool, current: StateMap): StateMap {
  const next: StateMap = { ...current };
  const shim = {
    get: (k: string) => next[k],
    set: (k: string, v: unknown) => {
      next[k] = v === null || v === undefined ? "" : String(v);
    },
  };

  for (const node of tool.nodes) {
    if (node.type !== "code") {
      continue;
    }
    try {
      const fn = new Function(
        "state",
        `${node.code}\n;if (typeof run === "function") { return run(state); }`,
      );
      fn(shim);
    } catch (err) {
      // Author error — surface to console, keep the preview alive.
      console.warn("[ToolBuilder] code node failed:", err);
    }
  }
  return next;
}

/** Node-card subtitle text (the mono line under the title). */
export function nodeSubtitle(
  node: ToolNode,
  stateNode: StateNode | null,
): string | null {
  switch (node.type) {
    case "state":
      return `Available State [${node.states.length}]`;
    case "text_run_reset":
    case "text_run":
    case "textarea":
      return `Using State [${resolveBinding(node.binding, stateNode)}]`;
    case "canvas":
      return `#${node.elementId}`;
    case "code":
      return null;
  }
}
