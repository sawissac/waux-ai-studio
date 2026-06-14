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

/** A function the model may call. `parameters` is a JSON-Schema object. */
export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Runs one tool call and returns its result as text to feed back to the model.
 * Receives the tool name and parsed argument object.
 */
export type ToolDispatcher = (
  name: string,
  args: Record<string, unknown>,
) => Promise<string> | string;

export interface GeminiOptions {
  prompt?: string;
  messages?: ChatMessage[];
  model?: string;
  apiKey?: string;
  systemInstruction?: string;
  signal?: AbortSignal;
  /** Tools the model may call. */
  tools?: readonly AiTool[];
  /** Invoked for each tool call; its result is sent back to the model. */
  onToolCall?: ToolDispatcher;
  /** Max tool-call rounds before forcing a final answer (default 4). */
  maxToolRounds?: number;
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
  /** Tools the model may call. */
  tools?: readonly AiTool[];
  /** Invoked for each tool call; its result is sent back to the model. */
  onToolCall?: ToolDispatcher;
  /** Max tool-call rounds before forcing a final answer (default 4). */
  maxToolRounds?: number;
}

function readKey(name: string): string {
  if (typeof window === "undefined") {
    return "";
  }
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
  if (opts.systemInstruction) {
    return opts.systemInstruction;
  }
  const sys = opts.messages?.find((m) => m.role === "system");
  return sys?.content;
}

/**
 * Call Google Gemini's `generateContent` REST endpoint and return assistant
 * text. Throws on HTTP error.
 */
export async function callGemini(opts: GeminiOptions): Promise<string> {
  const apiKey = opts.apiKey || readKey("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Gemini: missing apiKey (set localStorage GEMINI_API_KEY)");
  }
  const model = opts.model || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const contents = toGeminiContents(opts) as Array<Record<string, unknown>>;
  const sys = pickGeminiSystem(opts);
  const tools = opts.tools?.length
    ? [
        {
          functionDeclarations: opts.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ]
    : undefined;
  const maxRounds = opts.maxToolRounds ?? 4;

  for (let round = 0; ; round++) {
    const body: Record<string, unknown> = { contents };
    if (sys) {
      body.systemInstruction = { parts: [{ text: sys }] };
    }
    if (tools) {
      body.tools = tools;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${text || res.statusText}`);
    }
    const json = await res.json();
    const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts
      .filter((p) => p?.functionCall)
      .map((p) => p.functionCall);

    if (tools && opts.onToolCall && calls.length && round < maxRounds) {
      contents.push({ role: "model", parts });
      const responseParts: Array<Record<string, unknown>> = [];
      for (const call of calls) {
        const result = await opts.onToolCall(
          call.name,
          (call.args as Record<string, unknown>) ?? {},
        );
        responseParts.push({
          functionResponse: { name: call.name, response: { result } },
        });
      }
      contents.push({ role: "user", parts: responseParts });
      continue;
    }
    return parts.map((p) => p?.text ?? "").join("");
  }
}

function toOpenRouterMessages(opts: OpenRouterOptions): ChatMessage[] {
  if (opts.messages?.length) {
    return opts.messages;
  }
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
  if (!apiKey) {
    throw new Error(
      "OpenRouter: missing apiKey (set localStorage OPENROUTER_API_KEY)",
    );
  }
  const model = opts.model || "openrouter/auto";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (opts.referer) {
    headers["HTTP-Referer"] = opts.referer;
  }
  if (opts.appTitle) {
    headers["X-Title"] = opts.appTitle;
  }

  const messages = [...toOpenRouterMessages(opts)] as unknown as Array<
    Record<string, unknown>
  >;
  const tools = opts.tools?.length
    ? opts.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }))
    : undefined;
  const maxRounds = opts.maxToolRounds ?? 4;

  for (let round = 0; ; round++) {
    const body: Record<string, unknown> = { model, messages };
    if (tools) {
      body.tools = tools;
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter ${res.status}: ${text || res.statusText}`);
    }
    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    const toolCalls = msg?.tool_calls;

    if (
      tools &&
      opts.onToolCall &&
      Array.isArray(toolCalls) &&
      toolCalls.length &&
      round < maxRounds
    ) {
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: toolCalls,
      });
      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc?.function?.arguments || "{}");
        } catch {
          args = {};
        }
        const result = await opts.onToolCall(tc?.function?.name ?? "", args);
        messages.push({
          role: "tool",
          tool_call_id: tc?.id,
          content: result,
        });
      }
      continue;
    }
    return msg?.content ?? "";
  }
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
  if (openRouterCache) {
    return openRouterCache;
  }
  if (openRouterPending) {
    return openRouterPending;
  }
  openRouterPending = (async () => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
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
