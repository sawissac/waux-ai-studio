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
  ChatToolNodeSummary,
  StateSlotInfo,
} from "@/constants/ai-prompts";
import { nodeDocsContext } from "@/constants/ai-prompts";
import { createNode, NODE_META } from "@/constants/tool-builder";
import type { AiTool } from "@/lib/ai-providers";
import { getNodeReference, getNodeReferenceFor } from "@/lib/node-catalog";
import { nodeSubtitle } from "@/lib/tool-builder-runtime";
import type {
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

  return { toolName: tool?.name ?? null, nodes, stateSlots, catalog, docs };
}

/**
 * Tool the chat assistant can call to fetch one node type's full documentation
 * on demand — so it can answer about **any** node, not only those in the open
 * tool. Pair with {@link lookupNodeDocs} as the dispatcher.
 */
export const NODE_DOCS_TOOL: AiTool = {
  name: "get_node_docs",
  description:
    "Get full documentation for a Builder node type (summary, when to use, config fields, state I/O, tips). Call this whenever the user asks about a specific node — including nodes not present in the open tool.",
  parameters: {
    type: "object",
    properties: {
      node_type: {
        type: "string",
        description:
          "Which node — its type id, @slug, or label, e.g. 'math', '@math', or 'Math / Expression'.",
      },
    },
    required: ["node_type"],
  },
};

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

/**
 * Dispatcher for {@link NODE_DOCS_TOOL}: resolve the requested node and return
 * its full documentation as prompt text, or a not-found hint.
 *
 * @param query - The model-supplied node id / slug / label.
 */
export function lookupNodeDocs(query: string): string {
  const type = resolveNodeType(query);
  const ref = type ? getNodeReferenceFor(type) : undefined;
  if (!ref) {
    return `No node matches "${query}". Check the node catalog in the system prompt for the right @slug.`;
  }
  return nodeDocsContext([
    {
      slug: ref.slug,
      label: ref.label,
      summary: ref.summary,
      whenToUse: ref.whenToUse,
      config: ref.config.map((c) => c.name),
      reads: ref.io.reads,
      writes: ref.io.writes,
      tips: ref.tips,
    },
  ]).trim();
}

/* ===================================================================== *
 * Build tools — let the chat assistant construct the open tool by adding,
 * configuring, connecting, and removing nodes. Nodes are addressed by their
 * 1-based chain index (from `get_tool`); internal node ids never reach the
 * model, consistent with the rest of this module.
 * ===================================================================== */

/** Node config keys the model may never set (identity / discriminators). */
const PROTECTED_CONFIG_KEYS: ReadonlySet<string> = new Set([
  "id",
  "type",
  "elementId",
]);

/** Strip protected keys from a model-supplied config patch. */
function sanitizeConfig(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object") {
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

/** A node minus its internal id — the shape echoed back to the model. */
function omitNodeId(node: ToolNode): Record<string, unknown> {
  const { id: _id, ...rest } = node;
  return rest;
}

/** Resolve a 1-based chain index to its node, or null when out of range. */
function nodeAtIndex(tool: Tool | null, index: unknown): ToolNode | null {
  const i = Number(index);
  if (!tool || !Number.isInteger(i) || i < 1 || i > tool.nodes.length) {
    return null;
  }
  return tool.nodes[i - 1];
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

/** Name-mode slot names a node references through any of its bindings. */
function nodeBindingSlots(node: ToolNode): string[] {
  const out: string[] = [];
  for (const value of Object.values(node)) {
    if (isBinding(value) && value.mode === "name" && value.value.trim()) {
      out.push(value.value);
    }
  }
  return out;
}

/**
 * Validate one node against its type and the tool's state slots so the build
 * tools can tell the model whether its edit actually landed correctly. Catches
 * the two ways a config patch silently goes wrong: a field name that isn't on
 * this node type (it sticks but does nothing), and a name-mode binding pointing
 * at a state slot that doesn't exist (the wire is dead).
 *
 * @param node - The node to check (post-mutation).
 * @param tool - The open tool, for resolving slot references.
 * @returns Human-readable warnings; empty when the node is sound.
 */
function validateNode(node: ToolNode, tool: Tool): string[] {
  const warnings: string[] = [];
  const label = NODE_META[node.type].label;

  const known = new Set(Object.keys(createNode(node.type)));
  for (const key of Object.keys(node)) {
    if (!known.has(key)) {
      warnings.push(
        `"${key}" is not a field of the ${label} node — it has no effect. Remove it or use the correct field (call get_node_docs).`,
      );
    }
  }

  const slots = slotNames(tool);
  for (const [field, value] of Object.entries(node)) {
    if (isBinding(value) && value.mode === "name" && value.value.trim()) {
      if (!slots.has(value.value)) {
        warnings.push(
          `"${field}" binds to state slot "${value.value}", which does not exist — create it with add_state_slot or fix the name.`,
        );
      }
    }
  }

  return warnings;
}

/** Serialise the open tool for the model: slots + indexed, id-free, validated nodes. */
function serializeTool(tool: Tool | null): string {
  if (!tool) {
    return JSON.stringify({ tool: null, note: "No tool is open." });
  }
  const stateNode = tool.nodes.find((n) => n.type === "state");
  const stateSlots = (stateNode?.states ?? []).map((s) => ({
    name: s.name,
    value: s.value,
  }));
  let issues = 0;
  const nodes = tool.nodes.map((n, i) => {
    const warnings = validateNode(n, tool);
    issues += warnings.length;
    return {
      index: i + 1,
      label: NODE_META[n.type].label,
      slug: NODE_META[n.type].slug,
      config: omitNodeId(n),
      ...(warnings.length ? { warnings } : {}),
    };
  });
  // Wiring map: which node indices touch each slot. Two nodes are connected
  // only by sharing a slot name, so a slot touched by a single node is a likely
  // dangling output/input the model should hook up.
  const wiring = stateSlots.map((s) => {
    const usedByNodes = tool.nodes
      .map((n, i) => (nodeBindingSlots(n).includes(s.name) ? i + 1 : 0))
      .filter((i) => i > 0);
    return {
      slot: s.name,
      usedByNodes,
      ...(usedByNodes.length < 2
        ? {
            hint: "Only one node touches this slot — its output is not connected to a consumer (or its input has no producer) yet.",
          }
        : {}),
    };
  });
  return JSON.stringify(
    {
      tool: tool.name,
      stateSlots,
      wiring,
      nodes,
      issues,
      verified: issues === 0,
    },
    null,
    2,
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

/**
 * Callbacks the build tools need from the live editor. Pure data in/out — the
 * caller (ChatView) binds these to Redux dispatch + a fresh-state reader so the
 * tools always observe their own prior mutations.
 */
export interface BuilderToolDeps {
  /** Latest snapshot of the open tool — read AFTER every mutation. */
  getTool: () => Tool | null;
  /** Append a node of `type` to the open tool (it becomes the last node). */
  addNode: (type: ToolNodeType) => void;
  /** Patch the config of the node with `id`. */
  updateNode: (id: string, changes: Record<string, unknown>) => void;
  /** Remove the node with `id`. */
  deleteNode: (id: string) => void;
  /** Move node `activeId` to the chain slot currently held by `overId`. */
  moveNode: (activeId: string, overId: string) => void;
  /** Add a shared-state slot by name (creates the State Control if needed). */
  addStateSlot: (name: string, value?: string) => void;
  /** Surface a plan to the user (renders Confirm / Cancel in the chat). */
  onProposePlan: (plan: PlanProposal) => void;
  /** Whether the user has approved the pending plan for THIS build turn. */
  isPlanConfirmed: () => boolean;
}

/** Tools the chat assistant calls to build the open tool. */
export const BUILDER_TOOLS: readonly AiTool[] = [
  {
    name: "propose_plan",
    description:
      "Register your build plan for approval BEFORE building. You MUST call this and wait for the user to approve IN CHAT before any add_node / update_node / add_state_slot / delete_node — those tools are rejected until the user replies to approve. Pass a short summary, the state slots you will create, and the ordered build steps (one per node, noting its type and which slot it reads/writes). After calling it, write the plan in your reply as a short numbered list and ask the user to reply to approve (e.g. 'yes' / 'build it').",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "One or two sentences on what the tool will do.",
        },
        slots: {
          type: "array",
          items: { type: "string" },
          description: "Shared-state slot names you will create.",
        },
        steps: {
          type: "array",
          items: { type: "string" },
          description:
            "Ordered build steps — one per node, with its type and which slot it reads/writes.",
        },
      },
      required: ["summary", "steps"],
    },
  },
  {
    name: "get_tool",
    description:
      "Read the open tool's live state: its name, every shared-state slot (name + value), and every node in run order with a 1-based index and its full current config. Call this before building to orient yourself, and again after edits to verify. Nodes are addressed by the index returned here.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "add_node",
    description:
      "Append a node to the end of the open tool's chain. Optionally pass a `config` object to set its fields in the same call (call get_node_docs first to learn the node's fields). Returns the new node's 1-based index and resulting config.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Node type — its type id, @slug, or label (e.g. 'ai', '@ai', 'AI').",
        },
        config: {
          type: "object",
          description:
            'Optional partial config to apply. Bindings are objects like { "mode": "name", "value": "slotName" }. Never set id/type.',
        },
      },
      required: ["type"],
    },
  },
  {
    name: "update_node",
    description:
      "Patch the config of the node at `index` (from get_tool). Pass only the fields you want to change in `config`. Use this to wire a node to shared state by setting its binding/input/output to a slot name.",
    parameters: {
      type: "object",
      properties: {
        index: {
          type: "integer",
          description: "1-based chain index of the node to update.",
        },
        config: {
          type: "object",
          description:
            'Partial config to merge. Bindings are { "mode": "name", "value": "slotName" }. Never set id/type.',
        },
      },
      required: ["index", "config"],
    },
  },
  {
    name: "add_state_slot",
    description:
      "Add a shared-state slot the tool's nodes pass data through. Creates the State Control node if the tool has none. No-ops on a duplicate name. Returns the full slot list.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Slot key other nodes bind to." },
        value: {
          type: "string",
          description: "Optional default/seed value for the preview runtime.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_build_prompt",
    description:
      "Return a reproducible, copy-pasteable build instruction for the open tool — pasted into a fresh Builder chat it recreates the same tool. Call this when the user asks for 'a prompt for this tool', 'a prompt to rebuild/recreate this tool', or similar, then relay the returned text verbatim inside a fenced code block.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "delete_node",
    description: "Remove the node at `index` (from get_tool) from the chain.",
    parameters: {
      type: "object",
      properties: {
        index: {
          type: "integer",
          description: "1-based chain index of the node to delete.",
        },
      },
      required: ["index"],
    },
  },
  {
    name: "move_node",
    description:
      "Reposition a node in the chain WITHOUT deleting and re-adding it. Moves the node at `from` so it lands at position `to`; nodes between them shift to fill the gap, exactly like dragging the node in the editor. This is the ONLY correct way to reorder — never delete a node and rebuild the tail to change its position. Both indices are 1-based, from the latest get_tool. Returns the full reordered chain (new 1-based indices + labels) so you can re-orient without another get_tool. The State Control stays pinned at the top: you cannot move it, nor move any node above it (`to` must be 2 or greater).",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "integer",
          description: "1-based index of the node to move (from get_tool).",
        },
        to: {
          type: "integer",
          description:
            "1-based index the node should occupy after the move. Must be 2 or greater (the State Control stays first).",
        },
      },
      required: ["from", "to"],
    },
  },
];

/**
 * Build a {@link ToolDispatcher}-compatible handler for {@link BUILDER_TOOLS}.
 * Each call mutates through `deps`, then re-reads the tool so the JSON it
 * returns reflects the change — the model trusts that over the prompt snapshot.
 *
 * @param deps - Live editor callbacks (dispatch + fresh-state reader).
 * @returns A `(name, args) => string` dispatcher for the build tool names.
 */
export function createBuilderToolDispatcher(
  deps: BuilderToolDeps,
): (name: string, args: Record<string, unknown>) => string {
  // Node types whose docs the model has fetched this session. add_node /
  // update_node are gated on this so the model always reads a node's docs
  // before using it, and sets the right config fields.
  const docsRead = new Set<ToolNodeType>();

  return (name, args) => {
    switch (name) {
      case "get_node_docs": {
        const query = String(args.node_type ?? "");
        const type = resolveNodeType(query);
        if (type) {
          docsRead.add(type);
        }
        return lookupNodeDocs(query);
      }

      case "get_tool":
        return serializeTool(deps.getTool());

      case "get_build_prompt":
        return buildToolPrompt(deps.getTool());

      case "propose_plan": {
        // Already approved for this turn — don't re-show the card; build now.
        if (deps.isPlanConfirmed()) {
          return JSON.stringify({
            ok: true,
            status: "already_confirmed",
            note: "The user already approved this plan. Do NOT call propose_plan again — build it now with add_state_slot / add_node / update_node, then verify with get_tool.",
          });
        }
        const summary = String(args.summary ?? "").trim();
        // Strip any leading "1. " / "1) " the model already put on a step so it
        // isn't double-numbered when the UI renders the steps as a list.
        const steps = Array.isArray(args.steps)
          ? args.steps.map((s) =>
              String(s)
                .replace(/^\s*\d+[.)]\s*/, "")
                .trim(),
            )
          : [];
        const slots = Array.isArray(args.slots) ? args.slots.map(String) : [];
        if (!summary || steps.length === 0) {
          return JSON.stringify({
            error: "propose_plan needs a summary and at least one step.",
          });
        }
        deps.onProposePlan({ summary, slots, steps });
        return JSON.stringify({
          ok: true,
          status: "awaiting_user_confirmation",
          note: "Plan registered. STOP here — present the plan in your reply as a short numbered list and ask the user to reply to approve (e.g. 'yes' / 'build it'). Do NOT call any mutating tool. You may build only after the user approves in their next message.",
        });
      }

      case "add_node": {
        if (!deps.isPlanConfirmed()) {
          return JSON.stringify({
            error:
              "No approved plan yet. Call propose_plan and wait for the user to click Confirm before building.",
          });
        }
        const type = resolveNodeType(String(args.type ?? ""));
        if (!type) {
          return JSON.stringify({
            error: `Unknown node type "${args.type}". Check the node catalog for the right @slug.`,
          });
        }
        if (type === "state") {
          return JSON.stringify({
            error:
              "A tool has exactly one State Control, managed automatically. Do not add a 'state' node — create shared-state slots with add_state_slot instead.",
          });
        }
        if (!docsRead.has(type)) {
          return JSON.stringify({
            error: `Read its docs first: call get_node_docs for "${NODE_META[type].label}" (${NODE_META[type].slug}) before adding it, so you set the correct config fields.`,
          });
        }
        deps.addNode(type);
        const added = deps.getTool()?.nodes.at(-1);
        if (added && args.config) {
          deps.updateNode(added.id, sanitizeConfig(args.config));
        }
        const fresh = deps.getTool();
        const node = fresh?.nodes.at(-1);
        const warnings = node && fresh ? validateNode(node, fresh) : [];
        return JSON.stringify({
          ok: warnings.length === 0,
          added: NODE_META[type].label,
          index: fresh?.nodes.length ?? 0,
          config: node ? omitNodeId(node) : null,
          ...(warnings.length ? { warnings } : {}),
        });
      }

      case "update_node": {
        if (!deps.isPlanConfirmed()) {
          return JSON.stringify({
            error:
              "No approved plan yet. Call propose_plan and wait for the user to click Confirm before building.",
          });
        }
        const node = nodeAtIndex(deps.getTool(), args.index);
        if (!node) {
          return JSON.stringify({
            error: `No node at index ${args.index}. Call get_tool for valid indices.`,
          });
        }
        if (!docsRead.has(node.type)) {
          return JSON.stringify({
            error: `Read its docs first: call get_node_docs for "${NODE_META[node.type].label}" (${NODE_META[node.type].slug}) before configuring it, so you know which state it reads and writes and what to connect.`,
          });
        }
        deps.updateNode(node.id, sanitizeConfig(args.config));
        const fresh = deps.getTool();
        const updated = nodeAtIndex(fresh, args.index);
        const warnings = updated && fresh ? validateNode(updated, fresh) : [];
        return JSON.stringify({
          ok: warnings.length === 0,
          index: Number(args.index),
          config: updated ? omitNodeId(updated) : null,
          ...(warnings.length ? { warnings } : {}),
        });
      }

      case "delete_node": {
        if (!deps.isPlanConfirmed()) {
          return JSON.stringify({
            error:
              "No approved plan yet. Call propose_plan and wait for the user to click Confirm before building.",
          });
        }
        const node = nodeAtIndex(deps.getTool(), args.index);
        if (!node) {
          return JSON.stringify({
            error: `No node at index ${args.index}. Call get_tool for valid indices.`,
          });
        }
        deps.deleteNode(node.id);
        return JSON.stringify({
          ok: true,
          deleted: NODE_META[node.type].label,
          index: Number(args.index),
        });
      }

      case "move_node": {
        if (!deps.isPlanConfirmed()) {
          return JSON.stringify({
            error:
              "No approved plan yet. Call propose_plan and wait for the user to click Confirm before building.",
          });
        }
        const tool = deps.getTool();
        const active = nodeAtIndex(tool, args.from);
        const over = nodeAtIndex(tool, args.to);
        if (!active || !over) {
          return JSON.stringify({
            error: `No node at ${!active ? `from index ${args.from}` : `to index ${args.to}`}. Call get_tool for valid indices.`,
          });
        }
        if (active.type === "state") {
          return JSON.stringify({
            error:
              "The State Control stays pinned at the top of the chain — it cannot be moved.",
          });
        }
        if (over.type === "state") {
          return JSON.stringify({
            error:
              "Cannot move a node above the State Control. Choose a `to` index of 2 or greater.",
          });
        }
        if (active.id === over.id) {
          return JSON.stringify({
            ok: true,
            note: "from and to are the same node — nothing to move.",
          });
        }
        deps.moveNode(active.id, over.id);
        const fresh = deps.getTool();
        return JSON.stringify({
          ok: true,
          moved: NODE_META[active.type].label,
          from: Number(args.from),
          to: Number(args.to),
          chain: (fresh?.nodes ?? []).map((n, i) => ({
            index: i + 1,
            label: NODE_META[n.type].label,
          })),
        });
      }

      case "add_state_slot": {
        if (!deps.isPlanConfirmed()) {
          return JSON.stringify({
            error:
              "No approved plan yet. Call propose_plan and wait for the user to click Confirm before building.",
          });
        }
        const slotName = String(args.name ?? "").trim();
        if (!slotName) {
          return JSON.stringify({ error: "name is required." });
        }
        deps.addStateSlot(
          slotName,
          args.value === undefined ? undefined : String(args.value),
        );
        const stateNode = deps.getTool()?.nodes.find((n) => n.type === "state");
        return JSON.stringify({
          ok: true,
          stateSlots: (stateNode?.states ?? []).map((s) => ({
            name: s.name,
            value: s.value,
          })),
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool "${name}".` });
    }
  };
}
