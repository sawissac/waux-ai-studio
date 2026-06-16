/**
 * Generate a human-friendly tool name from a tool's node chain, using the
 * user's globally-selected Builder-chat model.
 *
 * Pure orchestration: it derives prompt context from the tool (via
 * `buildChatToolContext`), asks the selected provider for a name, and
 * sanitises the reply into a short title. No React, no app-state reads, and
 * no internal ids ever reach the model. Callers supply the resolved
 * `provider`/`model` (e.g. from `useChatModelPref`) and persist the result.
 */

import {
  buildToolNamePrompt,
  TOOL_NAME_SYSTEM_PROMPT,
} from "@/constants/ai-prompts";
import { callGemini, callOpenRouter } from "@/lib/ai-providers";
import { buildToolPrompt } from "@/lib/chat-context";
import type { AiProvider, Tool } from "@/types/tool-builder";

/** App-default model per provider, used when no model is explicitly selected. */
const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.5-flash",
  openrouter: "openrouter/auto",
};

/** Longest generated name we keep before truncating an over-eager reply. */
const MAX_NAME_LENGTH = 60;

/**
 * Turn a raw model reply into a clean, single-line tool name: first non-empty
 * line, stripped of surrounding quotes/backticks, markdown bullets, and
 * trailing punctuation, collapsed whitespace, and capped in length.
 */
function sanitizeName(raw: string): string {
  const firstLine = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) {
    return "";
  }
  return firstLine
    .replace(/^[-*•\d.)\s]+/, "") // leading bullet / list marker
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "") // wrapping quotes/backticks
    .replace(/[.。!?]+$/, "") // trailing sentence punctuation
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

/**
 * Ask the selected model to name a tool from its full build spec — input
 * labels, placeholders, Code/AI logic bodies, and shared-state slots — so the
 * name reflects what the tool actually does, not just its node types.
 *
 * @param args.tool - The tool to name (its nodes ground the prompt).
 * @param args.provider - The selected AI provider (`gemini` / `openrouter`).
 * @param args.model - The selected model id, or null to use the app default.
 * @param args.signal - Optional abort signal.
 * @returns A sanitised tool name.
 * @throws If the tool has no nodes, or the provider call fails / returns blank.
 */
export async function generateToolName(args: {
  tool: Tool;
  provider: AiProvider;
  model: string | null;
  signal?: AbortSignal;
}): Promise<string> {
  const { tool, provider, signal } = args;
  if ((tool.nodes ?? []).length === 0) {
    throw new Error("EMPTY_TOOL");
  }

  const model = args.model ?? DEFAULT_MODELS[provider];
  const opts = {
    model,
    signal,
    systemInstruction: TOOL_NAME_SYSTEM_PROMPT,
    prompt: buildToolNamePrompt(buildToolPrompt(tool)),
  };

  const reply =
    provider === "openrouter"
      ? await callOpenRouter(opts)
      : await callGemini(opts);
  const name = sanitizeName(reply);
  if (!name) {
    throw new Error("EMPTY_REPLY");
  }
  return name;
}
