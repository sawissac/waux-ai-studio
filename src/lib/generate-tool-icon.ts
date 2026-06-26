/**
 * Generate an SVG sidebar icon for a tool from its node chain, using the
 * user's globally-selected Builder-chat model.
 *
 * Pure orchestration (mirrors `generate-tool-name`): derive prompt context from
 * the tool (via `buildToolPrompt`), ask the selected provider for an SVG glyph,
 * then strip and sanitise the reply into safe, inline-renderable SVG markup. No
 * React, no app-state reads, and no internal ids ever reach the model. Callers
 * supply the resolved `provider`/`model` (e.g. from `useChatModelPref`) and
 * persist the result.
 */

import {
  buildToolIconPrompt,
  TOOL_ICON_SYSTEM_PROMPT,
} from "@/constants/ai-prompts";
import { callGemini, callOpenRouter } from "@/lib/ai-providers";
import { buildToolPrompt } from "@/lib/chat-context";
import { sanitizeSvgIcon } from "@/lib/html-sanitize";
import type { AiProvider, Tool } from "@/types/tool-builder";

/** App-default model per provider, used when no model is explicitly selected. */
const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.5-flash",
  openrouter: "openrouter/auto",
};

/**
 * Pull the first `<svg>…</svg>` element out of a model reply, tolerating
 * markdown code fences or stray prose around it. Returns "" when none is found.
 */
function extractSvg(raw: string): string {
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : "";
}

/**
 * Ask the selected model to draw an SVG icon for a tool from its full build
 * spec — input labels, Code/AI logic bodies, and shared-state slots — so the
 * glyph reflects what the tool actually does, not just its node types.
 *
 * @param args.tool - The tool to draw an icon for (its nodes ground the prompt).
 * @param args.provider - The selected AI provider (`gemini` / `openrouter`).
 * @param args.model - The selected model id, or null to use the app default.
 * @param args.signal - Optional abort signal.
 * @returns Sanitised SVG markup, safe to render via `dangerouslySetInnerHTML`.
 * @throws If the tool has no nodes (`EMPTY_TOOL`), or the provider call fails /
 *   returns no usable SVG (`EMPTY_REPLY`).
 */
export async function generateToolIcon(args: {
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
    systemInstruction: TOOL_ICON_SYSTEM_PROMPT,
    prompt: buildToolIconPrompt(buildToolPrompt(tool)),
  };

  const reply =
    provider === "openrouter"
      ? await callOpenRouter(opts)
      : await callGemini(opts);

  const svg = sanitizeSvgIcon(extractSvg(reply));
  if (!svg) {
    throw new Error("EMPTY_REPLY");
  }
  return svg;
}
