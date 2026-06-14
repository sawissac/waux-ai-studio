"use client";

import {
  AlertTriangle,
  Loader2,
  Plus,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { ModelCombobox } from "@/components/ui/model-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildChatSystemPrompt } from "@/constants/ai-prompts";
import { uuid } from "@/constants/tool-builder";
import { useChatModelPref } from "@/hooks/useChatModelPref";
import { useProviderModels } from "@/hooks/useProviderModels";
import { useTranslation } from "@/hooks/useTranslation";
import {
  callGemini,
  callOpenRouter,
  type ChatMessage,
} from "@/lib/ai-providers";
import {
  buildChatToolContext,
  lookupNodeDocs,
  NODE_DOCS_TOOL,
} from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import type { AiProvider, StateNode, Tool } from "@/types/tool-builder";

/** One turn in the transcript. */
interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
}

/** Largest height (px) the composer textarea auto-grows to before scrolling. */
const COMPOSER_MAX_HEIGHT = 160;

/** Default model per provider — the value used until the user picks another. */
const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.5-flash",
  openrouter: "openrouter/auto",
};

/** Human label per provider (proper nouns — not translated). */
const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Gemini",
  openrouter: "OpenRouter",
};

/** i18n keys for the empty-state suggestion chips, in display order. */
const SUGGESTIONS = [
  "chat.suggest.1",
  "chat.suggest.2",
  "chat.suggest.3",
] as const;

/**
 * ChatGPT-style assistant for the Builder panel's "chat" tab.
 *
 * Sends the conversation to the chosen provider (Gemini / OpenRouter, keys from
 * the AI-keys popover in the Tools panel) with a system prompt that grounds the
 * model in the **open tool**: its connected node chain, the full node catalog,
 * and in-depth docs for the node types in use — so users can ask what is wired
 * and how each node works. The prompt is assembled by `buildChatSystemPrompt`
 * ({@link "@/constants/ai-prompts"}) from data gathered by
 * {@link buildChatToolContext}; internal ids never reach the model.
 *
 * Shows a centred greeting + suggestion chips while empty, a scrolling
 * transcript of user (right) / assistant (left) bubbles, a thinking indicator
 * mid-request, and a pinned auto-growing composer. Neobrutalism styling + motion
 * tokens; honours the user `data-reduced-motion` setting.
 *
 * @param props.tool - The open tool, grounding context for the assistant.
 * @param props.stateNode - The tool's State Control node (for binding subtitles).
 */
export function ChatView({
  tool,
  stateNode,
}: {
  tool: Tool;
  stateNode: StateNode | null;
}) {
  const { t } = useTranslation();

  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  // Provider + model are a global per-user preference (persisted on profiles).
  const { provider, model: savedModel, save: savePref } = useChatModelPref();
  const model = savedModel ?? DEFAULT_MODELS[provider];
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerModels = useProviderModels(provider);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const empty = messages.length === 0;

  // Abort any in-flight request when the view unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the latest message in view as the transcript grows / thinking shows.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const reduced = document.documentElement.hasAttribute(
      "data-reduced-motion",
    );
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [messages, sending]);

  /** Reset the composer textarea back to its single-row height. */
  function resetComposerHeight() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
    }
  }

  /** Grow the composer to fit its content, capped at {@link COMPOSER_MAX_HEIGHT}. */
  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }

  /** Switch provider and reset the model to that provider's default. */
  function handleProviderChange(next: AiProvider) {
    savePref({ provider: next, model: DEFAULT_MODELS[next] });
  }

  /**
   * Send `history` (ending with the latest user turn) to the active provider
   * and append the reply, or surface a friendly error. Shared by send + retry.
   */
  const runAssistant = useCallback(
    async (history: ChatItem[]) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setError(null);
      setSending(true);

      const system = buildChatSystemPrompt(
        buildChatToolContext(tool, stateNode),
      );
      const apiMessages: ChatMessage[] = [
        { role: "system", content: system },
        ...history.map((m) => ({ role: m.role, content: m.text })),
      ];
      const opts = {
        messages: apiMessages,
        model: model || undefined,
        signal: ac.signal,
        tools: [NODE_DOCS_TOOL],
        onToolCall: (name: string, args: Record<string, unknown>) =>
          name === "get_node_docs"
            ? lookupNodeDocs(String(args.node_type ?? ""))
            : "",
      };

      try {
        const reply =
          provider === "openrouter"
            ? await callOpenRouter(opts)
            : await callGemini(opts);
        setMessages([
          ...history,
          { id: uuid(), role: "assistant", text: reply || "…" },
        ]);
      } catch (e) {
        if (ac.signal.aborted) {
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          /missing apikey/i.test(msg)
            ? t("chat.error.noKey", { provider: PROVIDER_LABELS[provider] })
            : t("chat.error.generic"),
        );
      } finally {
        if (!ac.signal.aborted) {
          setSending(false);
        }
      }
    },
    [tool, stateNode, model, provider, t],
  );

  /** Append the user's message and request a reply. No-ops while blank/sending. */
  function send(raw: string) {
    const text = raw.trim();
    if (!text || sending) {
      return;
    }
    const history: ChatItem[] = [
      ...messages,
      { id: uuid(), role: "user", text },
    ];
    setMessages(history);
    setInput("");
    resetComposerHeight();
    void runAssistant(history);
  }

  /** Re-send the last user turn after a failed attempt. */
  function retry() {
    if (sending || messages.at(-1)?.role !== "user") {
      return;
    }
    void runAssistant(messages);
  }

  /** Clear the transcript and cancel any in-flight request. */
  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setSending(false);
  }

  /** Enter sends; Shift+Enter inserts a newline. */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-foreground px-3 py-2.5">
        <Select
          value={provider}
          onValueChange={(v) => handleProviderChange(v as AiProvider)}
        >
          <SelectTrigger
            size="sm"
            aria-label={t("chat.provider")}
            className="h-7 w-auto gap-1 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="openrouter">OpenRouter</SelectItem>
          </SelectContent>
        </Select>
        <div className="min-w-0 flex-1 sm:max-w-56">
          <ModelCombobox
            value={model}
            onChange={(m) => savePref({ provider, model: m })}
            options={providerModels}
            placeholder={DEFAULT_MODELS[provider]}
            size="sm"
          />
        </div>
        {!empty && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="ml-auto"
            onClick={newChat}
          >
            <Plus />
            {t("chat.newChat")}
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          {empty ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="grid size-12 place-items-center border-2 border-foreground bg-primary text-primary-foreground shadow-nb">
                <Sparkles size={24} />
              </span>
              <h2 className="font-display text-lg font-bold">
                {t("chat.greeting")}
              </h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                {t("chat.subtitle")}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => send(t(key))}
                    className="nb-press border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold shadow-nb-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <MessageRow key={message.id} message={message} t={t} />
              ))}
              {sending && <ThinkingRow label={t("chat.thinking")} />}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t-2 border-foreground bg-background p-3 sm:p-4">
        <div className="mx-auto max-w-4xl">
          {error && (
            <div className="mb-2 flex items-center gap-2 border-2 border-destructive bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              <AlertTriangle size={14} className="shrink-0" />
              <span className="min-w-0 flex-1">{error}</span>
              {messages.at(-1)?.role === "user" && (
                <button
                  type="button"
                  onClick={retry}
                  className="shrink-0 font-bold underline underline-offset-2"
                >
                  {t("chat.retry")}
                </button>
              )}
            </div>
          )}
          <div className="flex items-end gap-2 border-2 border-foreground bg-card p-2 shadow-nb focus-within:ring-2 focus-within:ring-ring/50">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
              className="max-h-40 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              aria-label={t("chat.send")}
            >
              {sending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <SendHorizontal />
              )}
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            {t("chat.hint")}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A single transcript row. Assistant messages sit left with an avatar chip;
 * user messages sit right in a filled bubble. Enters with a token-timed
 * fade/slide that is frozen under reduced motion.
 *
 * @param props.message - The message to render.
 * @param props.t - Translator for the role label.
 */
function MessageRow({
  message,
  t,
}: {
  message: ChatItem;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex animate-in gap-2.5 fade-in slide-in-from-bottom-2 duration-(--motion-duration-base) [html[data-reduced-motion]_&]:animate-none",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!isUser && (
        <span className="grid size-8 shrink-0 place-items-center border-2 border-foreground bg-primary text-primary-foreground shadow-nb-sm">
          <Sparkles size={15} />
        </span>
      )}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          isUser ? "max-w-[80%]" : "flex-1",
        )}
      >
        <span
          className={cn(
            "text-[11px] font-bold text-muted-foreground",
            isUser ? "text-right" : "text-left",
          )}
        >
          {isUser ? t("chat.you") : t("chat.assistant")}
        </span>
        <div
          className={cn(
            "prose prose-sm max-w-none border-2 border-foreground px-3 py-2 text-sm wrap-break-word shadow-nb-sm *:first:mt-0 *:last:mb-0",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground dark:prose-invert",
          )}
        >
          <Markdown content={message.text} />
        </div>
      </div>
    </div>
  );
}

/**
 * Assistant-side placeholder shown while a reply is in flight: avatar chip plus
 * a spinner and "thinking" label.
 *
 * @param props.label - Localized "thinking…" text.
 */
function ThinkingRow({ label }: { label: string }) {
  return (
    <div className="flex animate-in gap-2.5 fade-in duration-(--motion-duration-base) [html[data-reduced-motion]_&]:animate-none">
      <span className="grid size-8 shrink-0 place-items-center border-2 border-foreground bg-primary text-primary-foreground shadow-nb-sm">
        <Sparkles size={15} />
      </span>
      <div className="inline-flex items-center gap-2 border-2 border-foreground bg-card px-3 py-2 text-sm text-muted-foreground shadow-nb-sm">
        <Loader2 size={14} className="animate-spin" />
        {label}
      </div>
    </div>
  );
}
