/**
 * Browser-side helpers for calling Gemini and OpenRouter from code nodes.
 *
 * Keys resolve in this order: explicit `apiKey` arg → `localStorage`
 * (`GEMINI_API_KEY` / `OPENROUTER_API_KEY`). Helpers return the assistant text
 * content as a string; callers stash it in tool state.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GeminiOptions {
  prompt?: string;
  messages?: ChatMessage[];
  model?: string;
  apiKey?: string;
  systemInstruction?: string;
  signal?: AbortSignal;
}

export interface OpenRouterOptions {
  prompt?: string;
  messages?: ChatMessage[];
  model?: string;
  apiKey?: string;
  systemInstruction?: string;
  signal?: AbortSignal;
  referer?: string;
  appTitle?: string;
}

function readKey(name: string): string {
  if (typeof window === "undefined") {return "";}
  try {
    return window.localStorage.getItem(name) ?? "";
  } catch {
    return "";
  }
}

function toGeminiContents(opts: GeminiOptions) {
  if (opts.messages?.length) {
    return opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
  }
  return [{ role: "user", parts: [{ text: opts.prompt ?? "" }] }];
}

function pickGeminiSystem(opts: GeminiOptions): string | undefined {
  if (opts.systemInstruction) {return opts.systemInstruction;}
  const sys = opts.messages?.find((m) => m.role === "system");
  return sys?.content;
}

/**
 * Call Google Gemini's `generateContent` REST endpoint and return assistant
 * text. Throws on HTTP error.
 */
export async function callGemini(opts: GeminiOptions): Promise<string> {
  const apiKey = opts.apiKey || readKey("GEMINI_API_KEY");
  if (!apiKey)
    {throw new Error("Gemini: missing apiKey (set localStorage GEMINI_API_KEY)");}
  const model = opts.model || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const body: Record<string, unknown> = {
    contents: toGeminiContents(opts),
  };
  const sys = pickGeminiSystem(opts);
  if (sys) {
    body.systemInstruction = { parts: [{ text: sys }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((p: any) => p?.text ?? "").join("");
  }
  return "";
}

function toOpenRouterMessages(opts: OpenRouterOptions): ChatMessage[] {
  if (opts.messages?.length) {return opts.messages;}
  const out: ChatMessage[] = [];
  if (opts.systemInstruction) {
    out.push({ role: "system", content: opts.systemInstruction });
  }
  out.push({ role: "user", content: opts.prompt ?? "" });
  return out;
}

/**
 * Call OpenRouter's chat completions endpoint and return assistant text.
 * Throws on HTTP error.
 */
export async function callOpenRouter(opts: OpenRouterOptions): Promise<string> {
  const apiKey = opts.apiKey || readKey("OPENROUTER_API_KEY");
  if (!apiKey)
    {throw new Error(
      "OpenRouter: missing apiKey (set localStorage OPENROUTER_API_KEY)",
    );}
  const model = opts.model || "openrouter/auto";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (opts.referer) {headers["HTTP-Referer"] = opts.referer;}
  if (opts.appTitle) {headers["X-Title"] = opts.appTitle;}

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: toOpenRouterMessages(opts),
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

/** Bundle of AI helpers exposed to code nodes as the `ai` arg. */
export const aiHelpers = {
  gemini: callGemini,
  openrouter: callOpenRouter,
};

export type AiHelpers = typeof aiHelpers;

/** Curated Gemini models that work with `generateContent`. */
export const GEMINI_MODELS: readonly string[] = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

/** Curated OpenRouter models. Free-form input still accepted. */
export const OPENROUTER_MODELS: readonly string[] = [
  "openrouter/auto",
  // Anthropic
  "anthropic/claude-opus-4.8",
  "anthropic/claude-opus-4.8-fast",
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-haiku-4.5",
  "~anthropic/claude-opus-latest",
  "~anthropic/claude-sonnet-latest",
  "~anthropic/claude-haiku-latest",
  // OpenAI
  "openai/gpt-5.5",
  "openai/gpt-5.5-pro",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/o3",
  "openai/o4-mini",
  "openai/gpt-oss-120b:free",
  // Google
  "google/gemini-3.5-flash",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "~google/gemini-pro-latest",
  "~google/gemini-flash-latest",
  // xAI
  "x-ai/grok-4.3",
  "x-ai/grok-4.20",
  // DeepSeek
  "deepseek/deepseek-v4-pro",
  "deepseek/deepseek-v3.2",
  "deepseek/deepseek-r1",
  "deepseek/deepseek-chat",
];

/** Map a provider key to its curated model list. */
export const MODELS_BY_PROVIDER: Record<string, readonly string[]> = {
  gemini: GEMINI_MODELS,
  openrouter: OPENROUTER_MODELS,
};

let openRouterCache: string[] | null = null;
let openRouterPending: Promise<string[]> | null = null;

/**
 * Fetch the live OpenRouter model catalogue (no auth required). Returns ids
 * sorted alphabetically. Cached for the session; falls back to the curated
 * static list on failure.
 */
export async function fetchOpenRouterModels(): Promise<string[]> {
  if (openRouterCache) {return openRouterCache;}
  if (openRouterPending) {return openRouterPending;}
  openRouterPending = (async () => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
      const json = await res.json();
      const ids: string[] = Array.isArray(json?.data)
        ? json.data
            .map((m: any) => (typeof m?.id === "string" ? m.id : ""))
            .filter(Boolean)
        : [];
      ids.sort((a, b) => a.localeCompare(b));
      openRouterCache = ids.length ? ids : [...OPENROUTER_MODELS];
      return openRouterCache;
    } catch {
      openRouterCache = [...OPENROUTER_MODELS];
      return openRouterCache;
    } finally {
      openRouterPending = null;
    }
  })();
  return openRouterPending;
}
