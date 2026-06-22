/**
 * Bridge the open tool's live domain data into the plain, prompt-ready shapes
 * the Builder chat assistant needs. Pure — no React, no Redux. Reads the node
 * catalogue (`@/lib/node-catalog`), per-node subtitles (`nodeSubtitle`), and
 * static node labels/slugs (`NODE_META`), and never surfaces internal ids
 * (node ids, organization id) to the model.
 *
 * The result feeds `buildChatSystemPrompt` from `@/constants/ai-prompts`, which
 * owns all prompt *wording*; this file only gathers the data.
 */

import type {
  ChatNodeCatalogEntry,
  ChatNodeDoc,
  ChatNodeSchema,
  ChatToolNodeSummary,
  StateSlotInfo,
} from "@/constants/ai-prompts";
import { createNode, NODE_META } from "@/constants/tool-builder";
import { getNodeReference, getNodeReferenceFor } from "@/lib/node-catalog";
import { nodeSubtitle } from "@/lib/tool-builder-runtime";
import type {
  BuildSpec,
  BuildSpecNode,
  StateBinding,
  StateNode,
  Tool,
  ToolNode,
  ToolNodeType,
} from "@/types/tool-builder";

/** Everything the chat assistant needs to know about the open tool. */
export interface ChatToolContext {
  toolName: string | null;
  nodes: ChatToolNodeSummary[];
  stateSlots: StateSlotInfo[];
  catalog: ChatNodeCatalogEntry[];
  docs: ChatNodeDoc[];
  /** Default config (the exact JSON shape) for every node type. */
  schemas: ChatNodeSchema[];
}

/** Deep-strip every `id` key so a schema example never shows generated ids. */
function stripIds<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripIds(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "id") {
        continue;
      }
      out[k] = stripIds(v);
    }
    return out as T;
  }
  return value;
}

/** Distinct node types in `tool`, in first-seen (chain) order. */
function usedNodeTypes(tool: Tool | null): ToolNodeType[] {
  const seen: ToolNodeType[] = [];
  for (const node of tool?.nodes ?? []) {
    if (!seen.includes(node.type)) {
      seen.push(node.type);
    }
  }
  return seen;
}

/**
 * Derive the chat assistant's grounding context from the open tool.
 *
 * @param tool - The open tool, or null when none is open.
 * @param stateNode - The tool's State Control node (for binding subtitles).
 * @returns The connected node chain, the compact catalog of every node type,
 *   and in-depth docs for the node types this tool uses.
 */
export function buildChatToolContext(
  tool: Tool | null,
  stateNode: StateNode | null,
): ChatToolContext {
  const nodes: ChatToolNodeSummary[] = (tool?.nodes ?? []).map((node, i) => {
    const meta = NODE_META[node.type];
    const sub = nodeSubtitle(node, stateNode);
    const value = sub?.value;
    const detail =
      sub && value !== undefined && `${value}` !== ""
        ? `${sub.label}: ${value}`
        : sub
          ? sub.label
          : undefined;
    return { index: i + 1, label: meta.label, slug: meta.slug, detail };
  });

  const docs = usedNodeTypes(tool)
    .map((type): ChatNodeDoc | null => {
      const ref = getNodeReferenceFor(type);
      if (!ref) {
        return null;
      }
      return {
        slug: ref.slug,
        label: ref.label,
        summary: ref.summary,
        whenToUse: ref.whenToUse,
        config: ref.config.map((c) => c.name),
        reads: ref.io.reads,
        writes: ref.io.writes,
        tips: ref.tips,
      };
    })
    .filter((d): d is ChatNodeDoc => d !== null);

  const catalog: ChatNodeCatalogEntry[] = getNodeReference().map((r) => ({
    slug: r.slug,
    label: r.label,
    blurb: r.blurb,
  }));

  const stateSlots: StateSlotInfo[] = (stateNode?.states ?? []).map((s) => ({
    name: s.name,
    value: s.value,
  }));

  // The exact JSON shape of every node type (defaults, ids stripped) so the
  // assistant can fill a build spec without reading per-node docs at runtime.
  const schemas: ChatNodeSchema[] = getNodeReference()
    .filter((r) => r.type !== "state")
    .map((r) => {
      const { id: _id, type: _type, ...config } = createNode(r.type);
      return {
        slug: r.slug,
        label: r.label,
        config: JSON.stringify(stripIds(config)),
      };
    });

  return {
    toolName: tool?.name ?? null,
    nodes,
    stateSlots,
    catalog,
    docs,
    schemas,
  };
}

/** Resolve a free-text node reference (type id / @slug / label) to a node type. */
function resolveNodeType(query: string): ToolNodeType | null {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  if (!q) {
    return null;
  }
  const refs = getNodeReference();
  const exact = refs.find(
    (r) =>
      r.type.toLowerCase() === q ||
      r.slug.toLowerCase().replace(/^@/, "") === q ||
      r.label.toLowerCase() === q,
  );
  if (exact) {
    return exact.type;
  }
  const partial = refs.find(
    (r) =>
      r.label.toLowerCase().includes(q) || q.includes(r.type.toLowerCase()),
  );
  return partial?.type ?? null;
}

/* ===================================================================== *
 * Build spec — the chat assistant emits the whole tool as one JSON object
 * (slots + ordered nodes) instead of incremental tool calls. These helpers
 * parse and sanitise that object; internal ids never reach the model.
 * ===================================================================== */

/** Node config keys the model may never set (identity / discriminators). */
const PROTECTED_CONFIG_KEYS: ReadonlySet<string> = new Set([
  "id",
  "type",
  "elementId",
]);

/** Strip protected keys (id/type/elementId) from a model-supplied config patch. */
function sanitizeConfig(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config as Record<string, unknown>)) {
    if (!PROTECTED_CONFIG_KEYS.has(k)) {
      out[k] = v;
    }
  }
  return out;
}

/** Type guard: a config value shaped like a {@link StateBinding}. */
function isBinding(v: unknown): v is StateBinding {
  return (
    !!v &&
    typeof v === "object" &&
    "mode" in v &&
    "value" in v &&
    typeof (v as StateBinding).value === "string"
  );
}

/** The set of state-slot names defined in `tool` (empty when no State Control). */
function slotNames(tool: Tool): Set<string> {
  const stateNode = tool.nodes.find((n) => n.type === "state");
  return new Set((stateNode?.states ?? []).map((s) => s.name));
}

/**
 * Validate one built node against its type and the tool's state slots, so a
 * post-build pass can tell the model what to correct on a fix turn. Catches the
 * two ways a config silently goes wrong: a field name that isn't on this node
 * type (it sticks but does nothing), and a name-mode binding pointing at a
 * state slot that doesn't exist (the wire is dead).
 *
 * @param node - The node to check.
 * @param tool - The open tool, for resolving slot references.
 * @returns Human-readable warnings; empty when the node is sound.
 */
export function validateNode(node: ToolNode, tool: Tool): string[] {
  const warnings: string[] = [];
  const label = NODE_META[node.type].label;

  const known = new Set(Object.keys(createNode(node.type)));
  for (const key of Object.keys(node)) {
    if (key === "id") {
      continue;
    }
    if (!known.has(key)) {
      warnings.push(
        `"${key}" is not a field of the ${label} node — it has no effect. Remove it or use the correct field from the node's schema.`,
      );
    }
  }

  const slots = slotNames(tool);
  for (const [field, value] of Object.entries(node)) {
    if (isBinding(value) && value.mode === "name" && value.value.trim()) {
      if (!slots.has(value.value)) {
        warnings.push(
          `"${field}" binds to state slot "${value.value}", which does not exist — add it to slots or fix the name.`,
        );
      }
    }
  }

  return warnings;
}

/**
 * Validate a whole tool node-by-node, the way {@link validateNode} does, and
 * return a flat list of `"<label>: <warning>"` lines (empty when sound). Used
 * after applying a build spec to feed concrete problems into a fix turn.
 *
 * @param tool - The open tool to check, or null.
 */
export function validateTool(tool: Tool | null): string[] {
  if (!tool) {
    return [];
  }
  return tool.nodes.flatMap((n) =>
    validateNode(n, tool).map((w) => `${NODE_META[n.type].label}: ${w}`),
  );
}

/** Config fields rendered as indented multi-line blocks, not inline scalars. */
const BODY_FIELDS: ReadonlySet<string> = new Set([
  "code",
  "prompt",
  "template",
]);

/** Describe one node as a numbered build-instruction block for {@link buildToolPrompt}. */
function describeNodeForPrompt(node: ToolNode, index: number): string {
  const meta = NODE_META[node.type];
  const labelField =
    "fieldLabel" in node ? (node as { fieldLabel?: string }).fieldLabel : "";
  const lines = [
    `${index}. ${meta.label} (${meta.slug})${labelField ? ` — "${labelField}"` : ""}`,
  ];
  for (const [key, value] of Object.entries(node)) {
    if (key === "id" || key === "type" || key === "fieldLabel") {
      continue;
    }
    if (value === "" || value === undefined || value === null) {
      continue;
    }
    if (isBinding(value)) {
      if (value.value.trim()) {
        lines.push(`   - ${key} → state "${value.value}"`);
      }
      continue;
    }
    if (key === "states" && Array.isArray(value)) {
      const names = value
        .map((s) => (s as { name?: string }).name)
        .filter(Boolean)
        .join(", ");
      lines.push(`   - slots: ${names || "(none)"}`);
      continue;
    }
    if (typeof value === "string" && BODY_FIELDS.has(key)) {
      const indented = value
        .split("\n")
        .map((l) => `       ${l}`)
        .join("\n");
      lines.push(`   - ${key}:\n${indented}`);
      continue;
    }
    lines.push(
      `   - ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`,
    );
  }
  return lines.join("\n");
}

/**
 * Render the open tool as a reproducible, copy-pasteable build instruction:
 * pasted into a fresh Builder chat, it recreates the same tool. Deterministic —
 * derived straight from the node graph (state slots, ordered nodes, their
 * config, and the state slots each binding wires to). Never includes node ids.
 *
 * @param tool - The open tool, or null when none is open.
 */
export function buildToolPrompt(tool: Tool | null): string {
  if (!tool || tool.nodes.length === 0) {
    return "The open tool is empty — nothing to export. Add nodes first, then ask again.";
  }
  const stateNode = tool.nodes.find((n) => n.type === "state");
  const slots = stateNode?.states ?? [];
  const slotLine = slots.length
    ? slots
        .map((s) =>
          s.value ? `${s.name} (default ${JSON.stringify(s.value)})` : s.name,
        )
        .join(", ")
    : "(none)";
  const body = tool.nodes
    .map((n, i) => describeNodeForPrompt(n, i + 1))
    .join("\n");
  return [
    `Build a Builder tool named "${tool.name}".`,
    "",
    `Shared state slots: ${slotLine}.`,
    "",
    "Create these nodes in order, top to bottom, wiring each binding to the state slot shown:",
    "",
    body,
    "",
    "Nodes pass data only through the shared state slots above and run top to bottom. After building, verify every binding points at an existing slot.",
  ].join("\n");
}

/** A build plan the assistant presents for the user to approve before building. */
export interface PlanProposal {
  /** One or two sentences on what the tool will do. */
  summary: string;
  /** Shared-state slot names the plan will create. */
  slots: string[];
  /** Ordered build steps — one per node, with its type and slot I/O. */
  steps: string[];
}

/** Name-mode slot names referenced anywhere in a config patch (walks nesting). */
function configSlots(config: unknown, out: Set<string>): void {
  if (Array.isArray(config)) {
    for (const item of config) {
      configSlots(item, out);
    }
    return;
  }
  if (config && typeof config === "object") {
    const obj = config as Record<string, unknown>;
    if (
      obj.mode === "name" &&
      typeof obj.value === "string" &&
      obj.value.trim()
    ) {
      out.add(obj.value.trim());
    }
    for (const v of Object.values(obj)) {
      configSlots(v, out);
    }
  }
}

/**
 * Derive a human-readable {@link PlanProposal} from a build spec, so a spec the
 * model emits can be shown as an approvable plan (never as raw JSON) and applied
 * on approval. One step per node — its label, @slug, and the slots it wires to.
 *
 * @param spec - The parsed build spec.
 */
export function planFromSpec(spec: BuildSpec): PlanProposal {
  const steps = spec.nodes.map((n) => {
    const meta = NODE_META[n.type];
    const ref = getNodeReferenceFor(n.type);
    const slots = new Set<string>();
    configSlots(n.config, slots);
    // Lead with the node's blurb (what it does), then the slots it wires to —
    // a fuller instruction than a bare label, and the @slug stays clickable.
    const blurb = ref?.blurb ? ` — ${ref.blurb.replace(/\.?$/, "")}` : "";
    const wires = slots.size
      ? ` Wired to ${[...slots].map((s) => `\`${s}\``).join(", ")}.`
      : "";
    return `**${meta.label}** (${meta.slug})${blurb}.${wires}`;
  });
  return {
    summary: spec.name?.trim()
      ? `Build “${spec.name.trim()}”.`
      : "Apply these changes to the tool.",
    slots: spec.slots.map((s) => s.name),
    steps,
  };
}

/**
 * Pull the first JSON object out of an assistant reply — a fenced ```json block
 * if present, otherwise the first `{ … }` span — and parse it. Returns null when
 * nothing parses.
 *
 * @param text - The assistant's raw reply.
 */
function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) {
    return null;
  }
  const candidates: string[] = [];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    candidates.push(fence[1]);
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    candidates.push(text.slice(first, last + 1));
  }
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        return obj as Record<string, unknown>;
      }
    } catch {
      // Not valid JSON — try the next candidate.
    }
  }
  return null;
}

/**
 * Parse a chat-assistant build reply into a {@link BuildSpec}. Recovers the JSON
 * object (fenced or inline), then normalises it: each node's `type` is resolved
 * from its id / @slug / label, its `config` is stripped of protected keys, and
 * unresolvable or `state` nodes are dropped (slots own the State Control).
 * Returns null when the reply has no usable `nodes` array.
 *
 * @param text - The assistant's raw reply.
 * @param allowEmpty - Accept an empty `nodes` array as a valid spec instead of
 *   returning null. A spec with zero nodes clears the tool down to its State
 *   Control — a legitimate "remove all nodes" build. Off by default so the
 *   chat-turn gun-jump check still only fires on a spec that actually builds
 *   something; the explicit build/fix turn passes it `true`.
 */
export function parseBuildSpec(
  text: string,
  allowEmpty = false,
): BuildSpec | null {
  const obj = extractJsonObject(text);
  if (!obj || !Array.isArray(obj.nodes)) {
    return null;
  }

  const nodes: BuildSpecNode[] = [];
  for (const raw of obj.nodes) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const entry = raw as Record<string, unknown>;
    const type = resolveNodeType(String(entry.type ?? ""));
    if (!type || type === "state") {
      continue;
    }
    // Accept config either nested under `config` or spread on the node object.
    const rawConfig =
      entry.config && typeof entry.config === "object"
        ? entry.config
        : (() => {
            const { type: _t, config: _c, ref: _r, ...rest } = entry;
            return rest;
          })();
    const config = sanitizeConfig(rawConfig);
    // `ref` is a spec-level target label, never a node field — pull it out.
    const ref =
      typeof entry.ref === "string"
        ? entry.ref
        : typeof config.ref === "string"
          ? config.ref
          : undefined;
    delete config.ref;
    nodes.push({ type, ref, config });
  }

  const slots = Array.isArray(obj.slots)
    ? obj.slots
        .map((s) => {
          if (typeof s === "string") {
            return { name: s.trim() };
          }
          if (s && typeof s === "object") {
            const o = s as Record<string, unknown>;
            return {
              name: String(o.name ?? "").trim(),
              value: o.value === undefined ? undefined : String(o.value),
            };
          }
          return { name: "" };
        })
        .filter((s) => s.name)
    : [];

  if (nodes.length === 0 && !allowEmpty) {
    return null;
  }

  return {
    name: typeof obj.name === "string" ? obj.name : undefined,
    slots,
    nodes,
  };
}
