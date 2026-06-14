/**
 * AI prompt catalog — the single source of truth for every system prompt and
 * prompt-context builder the app sends to a model.
 *
 * Four surfaces talk to a model, all routed through `@/lib/ai-providers`
 * (`callGemini` / `callOpenRouter`):
 *   • Code-editor "Ask AI" panel — authoring helper that writes code nodes.
 *   • Runtime `@ai` node          — answers the end user mid-chain.
 *   • Builder chat tab            — assistant that explains the open tool + nodes.
 *
 * Keep all prompt *text* here so wording is reviewed in one place. Callers pass
 * live context (state slots, editor content, the open tool's node chain) into
 * the builder functions; the builders never read app state directly and never
 * surface internal ids (node ids, organization id) to the model.
 */

/** A shared-state slot surfaced to the model: its name and current/seed value. */
export interface StateSlotInfo {
  /** Slot key other nodes bind to. */
  name: string;
  /** Current value (runtime) or default/seed (authoring). */
  value?: string;
}

/* ===================================================================== *
 * Base system prompts
 * ===================================================================== */

/** Base instruction for the code-editor Ask AI panel. */
export const CODE_EDITOR_SYSTEM_PROMPT =
  "You assist inside the code editor of a no-code tool builder. The code runs in a chain against a shared, flat key/value state store. A code node body defines up to three async functions — run(state, ai), change(state, ai), reset(state, ai) — where `state` exposes get(name) / set(name, value) / copyToClipboard(text), and `ai` exposes gemini(...) / openrouter(...) helpers. Read and write state only through the slot names listed below; do not invent slot names. Reply with code only (no markdown fences, no prose) unless explicitly asked for explanation.";

/** Base instruction for the runtime `@ai` node. */
export const AI_NODE_SYSTEM_PROMPT =
  "You are the AI step inside a no-code tool's run chain. The user's prompt may reference the tool's shared state with {{slotName}} tokens, already substituted with their values before you see the prompt. Answer the prompt directly and concisely; your reply is written into a bound state slot and shown to the end user.";

/** Base instruction for the Builder chat-tab assistant. */
export const CHAT_SYSTEM_PROMPT =
  "You are the assistant inside Builder, a no-code tool studio. Users compose tools as a top-to-bottom chain of input, logic, and output nodes that share a flat key/value state store, with a live preview. Help the user understand and build the open tool: explain what each node type does, how nodes connect through shared state slots, and what to add next. The currently open tool and its connected node chain are listed below; when you describe what THIS tool contains or how its nodes are wired, ground yourself strictly in that list and never claim a node is present when it is not. You can still answer about ANY node type in Builder, even ones not in the open tool — a compact catalog of every node type is provided, and you have a get_node_docs tool that returns a node's full documentation. Call get_node_docs whenever the user asks about a specific node so your answer is accurate; never refuse just because a node is not in the open tool. Refer to nodes by their label and @slug. Be concise and practical; prefer short paragraphs or bullet lists, and reply in the user's language.";

/* ===================================================================== *
 * Context builders — pure functions that assemble prompt text from live
 * data passed by the caller. No React, no app-state reads.
 * ===================================================================== */

/**
 * Render the tool's shared state slots as a context block to append to a
 * system prompt. `access` picks how the model is told to reach a slot — code
 * nodes use `state.get`/`state.set`, the `@ai` node uses `{{name}}` tokens.
 *
 * @param slots - Shared-state slots (name + optional value).
 * @param access - How the model should reach a slot.
 * @returns A leading-newline context block, or an empty-state note.
 */
export function stateContext(
  slots: readonly StateSlotInfo[] | undefined,
  access: "code" | "interpolation" = "code",
): string {
  const lines = (slots ?? [])
    .filter((s) => s.name.trim())
    .map((s) => {
      const v = s.value?.trim();
      return `- ${s.name}${v ? ` (value: ${JSON.stringify(s.value)})` : " (empty)"}`;
    });
  if (lines.length === 0) {
    return "\n\nThe tool has no shared state slots defined yet.";
  }
  const how =
    access === "code"
      ? "access them with state.get(name) / state.set(name, value)"
      : "reference them in the prompt with {{name}}";
  return `\n\nThe tool's shared state has ${lines.length} slot${
    lines.length === 1 ? "" : "s"
  } — ${how}:\n${lines.join("\n")}`;
}

/**
 * Assemble the full system prompt for the code-editor Ask AI panel: the base
 * instruction, the live state-slot context, the current editor content, and an
 * optional focused-selection note.
 *
 * @param args.stateSlots - Shared-state slots for the open tool.
 * @param args.value - Current editor content.
 * @param args.language - Editor language id (for the fenced code block).
 * @param args.selection - Currently selected snippet, if any.
 */
export function buildCodeEditorSystemPrompt(args: {
  stateSlots?: readonly StateSlotInfo[];
  value: string;
  language: string;
  selection?: string;
}): string {
  const { stateSlots, value, language, selection } = args;
  const contextNote = value
    ? `Current editor content (language: ${language}):\n\`\`\`${language}\n${value}\n\`\`\``
    : `(editor is empty; language: ${language})`;
  const trimmed = selection?.trim();
  const selectionNote = trimmed
    ? `\n\nThe user has selected this snippet — focus your answer on it:\n\`\`\`${language}\n${trimmed}\n\`\`\``
    : "";
  return `${CODE_EDITOR_SYSTEM_PROMPT}${stateContext(stateSlots, "code")}\n\n${contextNote}${selectionNote}`;
}

/**
 * Assemble the full system instruction for the runtime `@ai` node: the base
 * instruction plus the live state-slot context (interpolation access).
 *
 * @param slots - Shared-state slots with their current values.
 */
export function buildAiNodeSystemPrompt(
  slots: readonly StateSlotInfo[],
): string {
  return `${AI_NODE_SYSTEM_PROMPT}${stateContext(slots, "interpolation")}`;
}

/** One connected node in the open tool, summarised for the chat assistant. */
export interface ChatToolNodeSummary {
  /** 1-based position in the top-to-bottom chain. */
  index: number;
  /** Human label, e.g. "HTTP Request". */
  label: string;
  /** Catalog slug, e.g. "@http_request". */
  slug: string;
  /** One-line note: what it does / its state bindings. Internal ids excluded. */
  detail?: string;
}

/**
 * Render the open tool's connected node chain as a context block for the chat
 * assistant. Lists nodes in run order with their label, slug, and a one-line
 * detail so the model can reason about what is wired together.
 *
 * @param toolName - The open tool's name, or null if none is open.
 * @param nodes - The tool's nodes, in chain order.
 */
export function toolChainContext(
  toolName: string | null,
  nodes: readonly ChatToolNodeSummary[],
): string {
  if (!toolName) {
    return "\n\nNo tool is open yet — invite the user to create or open one.";
  }
  if (nodes.length === 0) {
    return `\n\nThe open tool "${toolName}" is empty — it has no nodes yet. Suggest starting with a State Control, then an input node.`;
  }
  const lines = nodes.map(
    (n) =>
      `${n.index}. ${n.label} (${n.slug})${n.detail ? ` — ${n.detail}` : ""}`,
  );
  return `\n\nThe open tool "${toolName}" has ${nodes.length} node${
    nodes.length === 1 ? "" : "s"
  }, connected top-to-bottom:\n${lines.join("\n")}`;
}

/** One node type in the compact catalog handed to the chat assistant. */
export interface ChatNodeCatalogEntry {
  /** Catalog slug, e.g. "@http_request". */
  slug: string;
  /** Canonical English label. */
  label: string;
  /** One-line blurb (empty string if none). */
  blurb: string;
}

/** Deeper documentation for one node type the open tool actually uses. */
export interface ChatNodeDoc {
  slug: string;
  label: string;
  /** What the node does and its mental model. */
  summary: string;
  /** When to reach for it. */
  whenToUse?: string;
  /** Config control names, in form order. */
  config?: readonly string[];
  /** Shared state it reads (null when none). */
  reads?: string | null;
  /** Shared state it writes (null when none). */
  writes?: string | null;
  /** Tips and gotchas. */
  tips?: readonly string[];
}

/**
 * Render the compact "every node type" catalog so the assistant can answer
 * documentation questions about any node, not only the ones in the open tool.
 *
 * @param entries - One line per node type.
 */
export function nodeCatalogContext(
  entries: readonly ChatNodeCatalogEntry[],
): string {
  const lines = entries
    .filter((e) => e.label)
    .map((e) => `- ${e.slug} (${e.label})${e.blurb ? `: ${e.blurb}` : ""}`);
  if (lines.length === 0) {
    return "";
  }
  return `\n\nNode catalog — every node type available in Builder:\n${lines.join("\n")}`;
}

/**
 * Render in-depth documentation for the node types used in the open tool, so
 * the assistant can explain the connected nodes precisely.
 *
 * @param docs - Full doc block per used node type.
 */
export function nodeDocsContext(docs: readonly ChatNodeDoc[]): string {
  if (docs.length === 0) {
    return "";
  }
  const blocks = docs.map((d) => {
    const parts = [`### ${d.label} (${d.slug})`, d.summary];
    if (d.whenToUse) {
      parts.push(`When to use: ${d.whenToUse}`);
    }
    if (d.config?.length) {
      parts.push(`Config fields: ${d.config.join(", ")}`);
    }
    if (d.reads || d.writes) {
      parts.push(
        `State — reads: ${d.reads ?? "—"}; writes: ${d.writes ?? "—"}`,
      );
    }
    if (d.tips?.length) {
      parts.push(`Tips:\n${d.tips.map((t) => `  - ${t}`).join("\n")}`);
    }
    return parts.join("\n");
  });
  return `\n\nDocumentation for the node types used in this tool:\n${blocks.join("\n\n")}`;
}

/**
 * Assemble the full system prompt for the Builder chat assistant: the base
 * instruction, the open tool's connected node chain, the compact node catalog,
 * and in-depth docs for the node types the tool uses.
 *
 * @param args.toolName - The open tool's name, or null.
 * @param args.nodes - The tool's nodes, in chain order.
 * @param args.catalog - Compact catalog of every node type (optional).
 * @param args.docs - In-depth docs for the node types in use (optional).
 */
export function buildChatSystemPrompt(args: {
  toolName: string | null;
  nodes: readonly ChatToolNodeSummary[];
  catalog?: readonly ChatNodeCatalogEntry[];
  docs?: readonly ChatNodeDoc[];
}): string {
  return [
    CHAT_SYSTEM_PROMPT,
    toolChainContext(args.toolName, args.nodes),
    args.catalog ? nodeCatalogContext(args.catalog) : "",
    args.docs ? nodeDocsContext(args.docs) : "",
  ].join("");
}
