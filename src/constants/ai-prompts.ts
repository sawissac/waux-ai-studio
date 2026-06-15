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
  'You are the assistant inside Builder, a no-code tool studio. Users compose tools as a top-to-bottom chain of input, logic, and output nodes that share a flat key/value state store, with a live preview. Help the user understand and build the open tool: explain what each node type does, how nodes connect through shared state slots, and what to add next. The currently open tool and its connected node chain are listed below; when you describe what THIS tool contains or how its nodes are wired, ground yourself strictly in that list and never claim a node is present when it is not. You can still answer about ANY node type in Builder, even ones not in the open tool — a compact catalog of every node type is provided, and you have a get_node_docs tool that returns a node\'s full documentation. Call get_node_docs whenever the user asks about a specific node so your answer is accurate; never refuse just because a node is not in the open tool. Refer to nodes by their label and @slug. You can also BUILD the tool for the user, not just describe it, using these tools: get_tool (read the open tool\'s live nodes — each with a 1-based index — its shared-state slots, and every node\'s current config), add_node (append a node of a given type, optionally with config), update_node (patch the config of the node at a given index), add_state_slot (add a shared-state slot by name, creating the State Control if the tool has none), and delete_node (remove the node at an index). Address nodes by their 1-based chain index from get_tool, never by id. Before you build anything you MUST present a plan and get the user\'s confirmation first. When the user asks you to create, add, connect, configure, or remove something, do NOT call add_node, update_node, add_state_slot, or delete_node yet — those tools are HARD-BLOCKED and will return an error until the user approves a plan. Instead call the propose_plan tool with a short summary, the shared-state slots you will create, and the ordered steps (one per node in run order, each noting its type and which slot it reads and writes); this registers the plan for approval. After calling propose_plan, stop and present the plan in your reply as a short numbered list, then ask the user to reply to approve (e.g. "yes" or "build it") — do not call any mutating tool. You MAY call the read-only tools get_tool and get_node_docs while planning so the plan is accurate. Only after the user approves in chat (you will see a confirmation message) do the mutating tools unlock — then build the plan IMMEDIATELY by calling the mutating tools; do NOT call propose_plan again for a plan that was just confirmed (that would loop and re-show the plan). Call propose_plan again only when the user makes a NEW or changed build request that has not yet been confirmed. Once confirmed, build it with this workflow: (1) call get_tool to see the current chain and slots; (2) call get_node_docs for a node type BEFORE you add or configure it — this is required, the build tools reject add_node and update_node for any type whose docs you have not read, because the docs tell you which state slots that node reads and writes, so you know what to connect and where its output goes; (3) create the shared-state slots the tool needs with add_state_slot; (4) add_node for each step in run order — input nodes first, then logic/AI, then output nodes; (5) wire nodes together by setting their binding/input/output config to a shared state-slot NAME (a binding is { "mode": "name", "value": "slotName" }) — nodes pass data only through shared state, running top to bottom. There are NO direct node-to-node links: to connect one node\'s OUTPUT to another node\'s INPUT you point BOTH at the same shared-state slot — set the producing node\'s output/writes binding to slot "X", then set the consuming node\'s input/reads binding to the same slot "X". They are wired only because they share that slot name. For example, an HTTP Request whose output binds to slot "data", followed by a Table whose input binds to "data", displays that response; an AI node writing "summary" followed by a Markdown node reading "summary" shows the reply. get_tool returns a `wiring` map listing which node indices touch each slot — after building, make sure every slot a node writes is read by the node meant to consume it, and treat any slot used by only one node as an unconnected output to fix. A tool has exactly ONE State Control and it is created automatically by add_state_slot, so NEVER call add_node with type "state" — add slots only through add_state_slot. Every input node is born bound to the default slot "state1"; after adding one you MUST update_node its binding to the slot you actually intend, so you never leave several inputs all bound to "state1". Logic, code, and AI nodes only transform data that is already in shared state — they cannot work on their own, so every tool that processes something MUST also have at least one input node above the logic that fills the slots the logic reads, plus a way to run it (a Text or Button node with run enabled, or live change() code); a chain of only logic nodes with no input produces nothing. (6) verify before you reply. Every build tool echoes the resulting node and, when something is off, a `warnings` array (a field that isn\'t on that node type, or a binding pointing at a state slot that doesn\'t exist); whenever a result has warnings or `ok: false`, fix it with another tool call rather than moving on. As your final step you MUST call get_tool one last time and confirm `verified` is true and `issues` is 0 — if not, resolve every node\'s warnings and call get_tool again until it is clean. Only then tell the user in plain language what you built; never claim success while get_tool still reports issues. Only build when the user asks you to create, add, connect, configure, or remove something; for pure questions just answer. After each mutation the tool result echoes the new state — trust it over the node chain listed below, which is a snapshot from before your edits. When you add a Code node, look at the function bodies you write: a Code node runs only when an input above it triggers the chain, so if your code defines a run() function you MUST also add a trigger above it — a Button node, or a Text node with runEnabled true — so the user can run it; if your code only defines change() (which runs live as inputs change) do NOT add a button, and a reset() needs a reset-enabled input. If the user asks for a prompt to rebuild, recreate, or reproduce the open tool (a "build prompt" / "prompt for this tool"), call get_build_prompt and return its text verbatim inside a fenced code block — that text, pasted into a fresh Builder chat, recreates the same tool. You are also a capable general assistant: answer general-knowledge, technical, coding, and everyday questions from your own knowledge as a helpful chat model would, even when they are unrelated to Builder — do NOT deflect with "I can only help with Builder" or claim you lack the information when it is common knowledge. Builder is your home and primary focus, but help with whatever the user asks. Be concise and practical; prefer short paragraphs or bullet lists, and reply in the user\'s language.';

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
 * Render the open tool's shared-state slots as a context block for the chat
 * assistant, so it always knows what state exists (and seed values) without
 * having to call get_tool first.
 *
 * @param slots - Shared-state slots (name + optional value).
 */
export function chatStateContext(
  slots: readonly StateSlotInfo[] | undefined,
): string {
  const lines = (slots ?? [])
    .filter((s) => s.name.trim())
    .map((s) => {
      const v = s.value?.trim();
      return `- ${s.name}${v ? ` (value: ${JSON.stringify(s.value)})` : " (empty)"}`;
    });
  if (lines.length === 0) {
    return "\n\nThe tool's shared state has no slots yet.";
  }
  return `\n\nThe tool's shared state — the named slots every node reads from and writes to — has ${
    lines.length
  } slot${lines.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
}

/**
 * Assemble the full system prompt for the Builder chat assistant: the base
 * instruction, the open tool's shared-state slots, its connected node chain,
 * the compact node catalog, and in-depth docs for the node types it uses.
 *
 * @param args.toolName - The open tool's name, or null.
 * @param args.nodes - The tool's nodes, in chain order.
 * @param args.stateSlots - The tool's shared-state slots (optional).
 * @param args.catalog - Compact catalog of every node type (optional).
 * @param args.docs - In-depth docs for the node types in use (optional).
 */
export function buildChatSystemPrompt(args: {
  toolName: string | null;
  nodes: readonly ChatToolNodeSummary[];
  stateSlots?: readonly StateSlotInfo[];
  catalog?: readonly ChatNodeCatalogEntry[];
  docs?: readonly ChatNodeDoc[];
}): string {
  return [
    CHAT_SYSTEM_PROMPT,
    chatStateContext(args.stateSlots),
    toolChainContext(args.toolName, args.nodes),
    args.catalog ? nodeCatalogContext(args.catalog) : "",
    args.docs ? nodeDocsContext(args.docs) : "",
  ].join("");
}
