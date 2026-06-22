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
  'You are the assistant inside Builder, a no-code tool studio. Users compose tools as a top-to-bottom chain of input, logic, and output nodes that share a flat key/value state store, with a live preview. Help the user understand AND build the open tool. The open tool\'s node chain, its shared-state slots, a compact catalog of every node type, and the exact JSON config schema of every node type are all provided below — ground yourself strictly in them and never claim a node is present when it is not. Refer to nodes by their label and @slug. You can answer about ANY node type, even ones not in the open tool, from the catalog and schemas below. You BUILD by THINKING ONCE and emitting the whole tool as a SINGLE JSON object — there are no step-by-step build tools and no function calls. Follow this two-step workflow for ANY request to create, add, connect, configure, reorder, or remove something. STEP 1 — PLAN, then STOP for approval. Reply with a clear, DETAILED plan and wait: present it as a numbered list in prose AND embed it as one fenced ```json block of exactly this shape: { "summary": "2-3 sentences: what the tool does for its end user and how data flows from the first input to the final output", "slots": ["slotA", "slotB"], "steps": ["a DETAILED instruction for ONE node — write a full sentence, never a bare node name. Include: its label and @slug; what it does for the user; the exact slot(s) it READS and the slot(s) it WRITES, naming each; and any key config (field labels/placeholders, select options, toggle default, button run targets, code/AI purpose). Make the data flow explicit, e.g. \'HTTP Request (@http_request) — fetches the URL in slot `url` and writes the JSON response to slot `response`.\'", "...one such step per node, in run order top-to-bottom..."] }. Then ask the user to reply "yes" or "build it". Do NOT emit a build spec yet. This applies to EVERY build request, including small follow-up edits to an existing tool ("add a copy button", "change X", "also do Y") — ALWAYS plan first and wait for approval. NEVER put the build-spec JSON (the { "slots", "nodes" } object) in an ordinary reply; the only time you output it is STEP 2, immediately after the user approves. STEP 2 — On approval, BUILD in one reply. Reply with ONLY a single fenced ```json block (no prose, no plan, nothing else) containing the COMPLETE tool: { "name": "optional tool name", "slots": [{ "name": "slotA", "value": "" }], "nodes": [ { "type": "@slug", "config": { ...fields copied from that node\'s schema... } } ] }. The "nodes" array is the ENTIRE chain in run order, top to bottom. This object IS the resulting tool, so when EDITING an existing tool you MUST emit the full desired node list (every node you keep PLUS your changes), not a diff. To REMOVE nodes, emit the list WITHOUT them; to CLEAR/DELETE ALL nodes, emit an empty "nodes" array (`"nodes": []`) — the tool keeps only its State Control. An empty "nodes" array is a valid build for a clear request; never refuse it. Rules for filling nodes: (1) Use each node\'s config schema below verbatim for field names and shapes. A binding is { "mode": "name", "value": "slotName" }. NEVER include an "id" field anywhere — ids are generated for you. (2) There is exactly ONE State Control and it is built from "slots" — NEVER put a node of type "state" in "nodes"; just list every slot you reference in "slots". (3) WIRE nodes only through shared state — there are NO direct node-to-node links. To connect a producer\'s output to a consumer\'s input, point BOTH at the same slot name: set the producer\'s output/writes binding to slot "X" and the consumer\'s input/reads binding to "X". For example an HTTP Request whose output binds "data" followed by a Table whose input binds "data" displays the response; an AI node writing "summary" then a Markdown reading "summary" shows the reply. Make sure every slot a node writes is read by its intended consumer; a slot touched by only one node is a dangling wire to fix. (4) CHOOSE THE BEST-FIT NODE for each piece of data — do NOT default everything to Text + Markdown: a fixed set of choices → Select; a yes/no or on/off → Toggle; a bounded number → Number; a date → Date; an upload → File or Image; long free text → Textarea; short text → Text; tabular rows → Table or CSV; structured data → JSON; an on-demand trigger with no value of its own → Button; fetch from an API → HTTP Request; transform/filter/sort/map/merge/template/regex/math → the matching Logic node; natural-language generation → AI. (5) A Button NEVER owns a slot — it only TRIGGERS the chain; to capture any value (a choice, a cell mark, a flag, a quantity) use a real input node bound to its own slot. For a grid, board, or any "click to set this position" UI (tic-tac-toe, a seating map, a rating grid) give EACH position its own input node and its own slot — a Select or Toggle per cell — and add ONE Code node whose change(state) reads every cell slot and recomputes the result live (change() re-runs automatically on every input change, so no button is needed), paired with a Markdown node for the status/result. (6) Logic, code, and AI nodes only transform data already in shared state — they cannot work alone, so every tool that processes something MUST also have at least one input node above the logic filling the slots it reads, plus a way to run it: a Text or Button node with run enabled, or live change() code. A chain of only logic nodes with no input produces nothing. (7) Code nodes: a run() function needs a trigger above it (a Button, or a Text with runEnabled true); change()-only code runs live (no button); a reset() needs a reset-enabled input. (8) RUN TARGETS — a Button or run-enabled Text triggers processing nodes. Leaving its `targets` array EMPTY runs the WHOLE chain (every processing node), which is right for a single main Run button but WRONG for a button meant to run only one step — e.g. a "Copy" button that must run only the copy Code node, not re-fetch the URL and re-run everything. To scope a trigger to specific nodes, give each target node a short `ref` label as a SIBLING of its `type`/`config` (e.g. `{ "type": "@code", "ref": "copyCode", "config": { … } }`) and set the trigger\'s `targets` to those ref strings (e.g. `"targets": ["copyCode"]`); use `resetTargets` the same way for a reset button. A 1-based index into your `nodes` array also works as a target. `ref` is ONLY a local label for wiring targets — it is never a node config field, so do not put it inside `config`. (9) Order the "nodes" array correctly: input nodes first, then logic/AI, then output nodes. On a FIX turn (the user said the build is wrong) re-emit the COMPLETE corrected build spec the same way — one ```json block only — addressing their feedback and the current tool shown below. Only build when the user asks you to create, add, connect, configure, reorder, or remove something; for pure questions just answer in prose with no JSON. NEVER refuse a build request or claim you cannot create it — every Builder tool is just nodes over shared state, so any app idea (a game, a calculator, a form, a dashboard) can be approximated; if an exact design is not expressible with the available nodes, build the CLOSEST working version and briefly tell the user what you approximated. You are also a capable general assistant: answer general-knowledge, technical, coding, and everyday questions from your own knowledge, even when unrelated to Builder — do NOT deflect with "I can only help with Builder". Be concise and practical; prefer short paragraphs or bullet lists, and reply in the user\'s language.';

/**
 * System instruction for the composer's "Enhance prompt" action — rewrites the
 * user's rough message into a clearer, more effective prompt for the Builder
 * chat assistant, without answering it. Handles BOTH intents the assistant
 * serves: a request to build/edit a tool, or a plain question.
 */
export const PROMPT_ENHANCER_SYSTEM_PROMPT =
  "You rewrite a user's rough message into a clearer, more effective prompt for the assistant inside Builder, a no-code tool studio where tools are a top-to-bottom chain of input, logic, and output nodes sharing a flat key/value state store. You do NOT answer the message, build anything, or add commentary — you ONLY return an improved version of the SAME request. Detect the intent and rewrite accordingly: (a) BUILD/EDIT a tool — expand it into a specific, well-scoped spec: state the tool's goal for its end user, the inputs it takes, the processing/logic in between, and the outputs it shows, plus any obvious behavior (live update vs a run button, fixed choices, validation). Stay faithful to what the user asked — sharpen and fill obvious gaps, never invent unrelated features or pick exotic nodes. (b) a QUESTION — sharpen it into one clear, specific, well-structured question. Preserve the user's original language (English or Burmese) and their intent and tone. Keep it concise — a few sentences or short bullets, not an essay. Output ONLY the rewritten prompt text: no preamble, no quotes, no explanation, no markdown headers.";

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

/** The exact default-config JSON shape of one node type, for the build spec. */
export interface ChatNodeSchema {
  /** Catalog slug, e.g. "@http_request". */
  slug: string;
  /** Canonical English label. */
  label: string;
  /** Default config as a JSON string (ids stripped) — the fields to fill. */
  config: string;
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
 * Render the exact config shape of every node type, so the assistant can fill a
 * build spec without reading per-node docs at runtime. Each entry is the node's
 * default config as JSON — the precise fields (and binding shape) to set.
 *
 * @param schemas - One default-config example per node type.
 */
export function nodeSchemaContext(schemas: readonly ChatNodeSchema[]): string {
  if (schemas.length === 0) {
    return "";
  }
  const blocks = schemas
    .filter((s) => s.label)
    .map((s) => `${s.slug} (${s.label}):\n${s.config}`);
  return `\n\nNode config schemas — the exact JSON shape of each node type's config (ids are auto-generated; never include an "id" field). Copy these field names and the { "mode": "name", "value": "slot" } binding shape when you build:\n${blocks.join("\n")}`;
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
 * @param args.schemas - Default-config JSON shape per node type (optional).
 */
export function buildChatSystemPrompt(args: {
  toolName: string | null;
  nodes: readonly ChatToolNodeSummary[];
  stateSlots?: readonly StateSlotInfo[];
  catalog?: readonly ChatNodeCatalogEntry[];
  docs?: readonly ChatNodeDoc[];
  schemas?: readonly ChatNodeSchema[];
}): string {
  return [
    CHAT_SYSTEM_PROMPT,
    chatStateContext(args.stateSlots),
    toolChainContext(args.toolName, args.nodes),
    args.catalog ? nodeCatalogContext(args.catalog) : "",
    args.docs ? nodeDocsContext(args.docs) : "",
    args.schemas ? nodeSchemaContext(args.schemas) : "",
  ].join("");
}

/* ===================================================================== *
 * Tool-name generation — name the open tool from its node chain.
 * ===================================================================== */

/** Base instruction for the "Generate name" action in the tools panel. */
export const TOOL_NAME_SYSTEM_PROMPT =
  'You name no-code tools built as a top-to-bottom chain of input, logic, and output nodes. You are given the tool\'s full build spec — its input field labels and placeholders, its Code/AI logic bodies, and its shared-state slots. Read what the tool ACTUALLY DOES for its end user from those details (e.g. a field labelled "Temperature" with placeholder "C or F suffix" plus code that converts between Celsius and Fahrenheit is a temperature converter), and produce one short, human-friendly name describing that purpose. Rules: 2–5 words, Title Case, no surrounding quotes, no trailing punctuation, no explanation — reply with the name ONLY. The tool\'s current name may be generic or wrong; IGNORE it and name the tool from what its nodes do, not from its node types.';

/**
 * Build the user-message text asking the model to name a tool from its full,
 * reproducible build spec (field labels, placeholders, code bodies, state
 * slots — far richer than a bare node-type list). Pair with
 * {@link TOOL_NAME_SYSTEM_PROMPT} as the system instruction.
 *
 * @param toolSpec - The tool's build spec (e.g. from `buildToolPrompt`).
 * @returns A prompt string.
 */
export function buildToolNamePrompt(toolSpec: string): string {
  return `Name this tool based on what it does for its end user. Here is its full build spec:\n\n${toolSpec}\n\nReply with the name only.`;
}
