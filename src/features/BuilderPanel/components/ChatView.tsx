"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  SendHorizontal,
  Sparkles,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import {
  callGemini,
  callOpenRouter,
  type ChatMessage,
} from "@/lib/ai-providers";
import {
  buildChatToolContext,
  BUILDER_TOOLS,
  createBuilderToolDispatcher,
  NODE_DOCS_TOOL,
  type PlanProposal,
} from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/hooks";
import type { AiProvider, StateNode, Tool } from "@/types/tool-builder";

/** One turn in the transcript. */
interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Control message (confirm / cancel / self-fix): sent to the model but not shown. */
  hidden?: boolean;
}

/** Largest height (px) the composer textarea auto-grows to before scrolling. */
const COMPOSER_MAX_HEIGHT = 160;

/** Max root-cause fix passes the user can trigger per build before it's capped. */
const MAX_SELF_FIX = 100;

/**
 * Where a build is in its lifecycle once a plan is approved:
 * - `building` — adding the planned nodes; the checklist ticks live.
 * - `review`   — done; asking the user whether the result is correct.
 * - `fixing`   — user said "No"; running a root-cause fix against the plan.
 * - `null`     — idle (ordinary chat).
 */
type BuildPhase = "building" | "review" | "fixing" | null;

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
 * Recover a plan from an assistant reply that contains the propose_plan args as
 * raw JSON instead of an actual tool call — weaker models (e.g. free OpenRouter
 * models) often emit the tool call as text. Scans fenced blocks and the first
 * `{…}` span for an object with a `summary` + non-empty `steps`.
 *
 * @param text - The assistant's reply text.
 * @returns The parsed plan, or null when the reply isn't a plan dump.
 */
function extractPlanFromText(text: string): PlanProposal | null {
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
      const obj = JSON.parse(c) as {
        summary?: unknown;
        slots?: unknown;
        steps?: unknown;
      };
      if (
        typeof obj.summary === "string" &&
        obj.summary.trim() &&
        Array.isArray(obj.steps) &&
        obj.steps.length > 0
      ) {
        return {
          summary: obj.summary.trim(),
          slots: Array.isArray(obj.slots) ? obj.slots.map(String) : [],
          steps: obj.steps.map((s) =>
            String(s)
              .replace(/^\s*\d+[.)]\s*/, "")
              .trim(),
          ),
        };
      }
    } catch {
      // Not valid JSON / not a plan — try the next candidate.
    }
  }
  return null;
}

/**
 * Render a recovered plan as a readable chat message (summary, slots, numbered
 * steps) with an approve prompt, replacing the raw JSON the model emitted.
 *
 * @param plan - The recovered plan.
 * @param t - Translator.
 */
function formatPlanMessage(
  plan: PlanProposal,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const slots = plan.slots.length
    ? `**${t("chat.plan.slots")}:** ${plan.slots.join(", ")}\n\n`
    : "";
  const steps = plan.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `${plan.summary}\n\n${slots}**${t("chat.plan.steps")}:**\n${steps}\n\n${t("chat.plan.askApprove")}`;
}

/**
 * Affirmative-reply matcher for chat-based plan approval. True when the user's
 * short reply clearly means "go ahead and build" — English or Burmese — so a
 * pending plan can be confirmed without a button. Long messages never match;
 * they're treated as new instructions, not a yes.
 *
 * @param text - The user's raw message.
 */
function isAffirmative(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 40) {
    return false;
  }
  const en =
    /^(y|ya|yes+|yep|yeah|yup|ok|okay|k|sure|go|go ahead|do it|build|build it|let'?s build|confirm(ed)?|proceed|continue|approve[d]?|lgtm|looks good|sounds good|create it|make it|build the plan)\b/;
  const my = /(ဟုတ်|ဆောက်|အတည်ပြု|လုပ်ပါ|ရပါ|သွား)/;
  return en.test(trimmed.toLowerCase()) || my.test(trimmed);
}

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
 * @param props.active - Whether the chat tab is the visible center view.
 * @param props.onUnread - Called when a reply arrives while the tab is hidden.
 */
export function ChatView({
  tool,
  stateNode,
  active = true,
  onUnread,
}: {
  tool: Tool;
  stateNode: StateNode | null;
  active?: boolean;
  onUnread?: () => void;
}) {
  const { t } = useTranslation();

  // Latest-value refs so the async reply handler reads current props without
  // widening runAssistant's deps (it would rebuild on every active toggle).
  const activeRef = useRef(active);
  activeRef.current = active;
  const onUnreadRef = useRef(onUnread);
  onUnreadRef.current = onUnread;

  // Build tools mutate through Redux; `getTool` reads fresh store state after
  // each call so the assistant observes its own prior edits within one turn.
  const store = useAppStore();
  const { addNode, updateNode, deleteNode, addStateSlot } = useToolBuilder();
  // Plan-confirm gate: propose_plan parks a plan here for the user to approve;
  // mutations stay blocked until `confirmedRef` is flipped by a Confirm click.
  const [pendingPlan, setPendingPlan] = useState<PlanProposal | null>(null);
  const confirmedRef = useRef(false);
  // The plan being built — kept past confirmation so the post-build review can
  // compare against it. `selfFixCount` caps the user-triggered fix passes.
  const confirmedPlanRef = useRef<PlanProposal | null>(null);
  const selfFixCountRef = useRef(0);
  // The confirmed plan, kept visible through the whole build → review → fix
  // lifecycle so the user always sees the SAME plan they approved.
  const [buildPlan, setBuildPlan] = useState<PlanProposal | null>(null);
  // Where we are in that lifecycle (see {@link BuildPhase}).
  const [buildPhase, setBuildPhase] = useState<BuildPhase>(null);
  // Mirror for the onToolCall closure, which would otherwise read stale state.
  const buildPhaseRef = useRef<BuildPhase>(null);
  buildPhaseRef.current = buildPhase;
  // How many plan steps are done — advanced as each node is added during the
  // build so the checklist ticks live.
  const [completedSteps, setCompletedSteps] = useState(0);
  // True when propose_plan was actually called (as a tool) this turn, so the
  // JSON-dump fallback doesn't double-handle a plan the tool already registered.
  const proposedThisTurnRef = useRef(false);

  /** Fresh snapshot of the open tool, straight from the store. */
  const getOpenTool = useCallback((): Tool | null => {
    const s = store.getState().toolBuilder;
    return s.tools.find((tl) => tl.id === s.selectedToolId) ?? null;
  }, [store]);

  const builderDispatch = useMemo(
    () =>
      createBuilderToolDispatcher({
        getTool: getOpenTool,
        addNode,
        updateNode,
        deleteNode,
        addStateSlot,
        onProposePlan: (plan) => setPendingPlan(plan),
        isPlanConfirmed: () => confirmedRef.current,
      }),
    [getOpenTool, addNode, updateNode, deleteNode, addStateSlot],
  );

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
      proposedThisTurnRef.current = false;

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
        tools: [NODE_DOCS_TOOL, ...BUILDER_TOOLS],
        // Higher round budget than the default 4 — building a tool takes many
        // inspect/add/configure calls in a single turn.
        maxToolRounds: 16,
        // All tools (incl. get_node_docs) route through builderDispatch so it
        // can record which node docs have been read and gate add/update on it.
        // While building, tick the plan checklist forward on each added node.
        onToolCall: (name: string, args: Record<string, unknown>) => {
          const result = builderDispatch(name, args);
          if (name === "propose_plan") {
            proposedThisTurnRef.current = true;
          }
          if (name === "add_node" && buildPhaseRef.current === "building") {
            try {
              if (JSON.parse(result)?.ok) {
                setCompletedSteps((c) => c + 1);
              }
            } catch {
              // Non-JSON result — the checklist just won't advance this step.
            }
          }
          return result;
        },
      };

      try {
        const reply =
          provider === "openrouter"
            ? await callOpenRouter(opts)
            : await callGemini(opts);
        // Fallback: when the model dumps the propose_plan args as JSON text
        // instead of calling the tool, recover the plan, register it as pending
        // (so an affirmative reply builds it), and show it as a readable plan.
        let displayText = reply || "…";
        if (
          !proposedThisTurnRef.current &&
          !confirmedRef.current &&
          !buildPhaseRef.current
        ) {
          const recovered = extractPlanFromText(reply);
          if (recovered) {
            setPendingPlan(recovered);
            displayText = formatPlanMessage(recovered, t);
          }
        }
        const next: ChatItem[] = [
          ...history,
          { id: uuid(), role: "assistant", text: displayText },
        ];
        setMessages(next);
        // Flag unread when the reply lands while the user is on another tab.
        if (!activeRef.current) {
          onUnreadRef.current?.();
        }

        // A build or fix turn just finished. Don't force the checklist to full —
        // leave it at what actually got built so the user can SEE any unfinished
        // steps — then ask whether the result is correct. Only fix on "No".
        if (confirmedRef.current && confirmedPlanRef.current) {
          setBuildPhase("review");
        }
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
        // A build/fix turn failed — drop the build UI so the user can retry.
        if (confirmedRef.current) {
          setBuildPhase(null);
          setBuildPlan(null);
          confirmedPlanRef.current = null;
        }
      } finally {
        // Close the build gate after every turn; it reopens only when the user
        // confirms a plan or clicks "No, fix it" on the review card.
        confirmedRef.current = false;
        if (!ac.signal.aborted) {
          setSending(false);
        }
      }
    },
    [tool, stateNode, model, provider, t, builderDispatch],
  );

  /** Append the user's message and request a reply. No-ops while blank/sending. */
  function send(raw: string) {
    const text = raw.trim();
    if (!text || sending) {
      return;
    }
    setInput("");
    resetComposerHeight();
    // A pending plan is approved by an affirmative chat reply (no card): open the
    // gate, keep the SAME plan on screen as a live checklist, and build it.
    if (pendingPlan && isAffirmative(text)) {
      startBuild(pendingPlan, text);
      return;
    }
    // Any other message is a new request: drop a pending plan and any in-flight
    // build review so the gate stays closed until a fresh approval.
    if (pendingPlan) {
      setPendingPlan(null);
    }
    if (buildPhase) {
      setBuildPhase(null);
      setBuildPlan(null);
      confirmedPlanRef.current = null;
    }
    const history: ChatItem[] = [
      ...messages,
      { id: uuid(), role: "user", text },
    ];
    setMessages(history);
    void runAssistant(history);
  }

  /** Re-send the last user turn after a failed attempt. */
  function retry() {
    if (sending || messages.at(-1)?.role !== "user") {
      return;
    }
    void runAssistant(messages);
  }

  /** Stop the in-flight request and tear down the build lifecycle. */
  function stop() {
    abortRef.current?.abort();
    setSending(false);
    confirmedRef.current = false;
    confirmedPlanRef.current = null;
    setBuildPlan(null);
    setBuildPhase(null);
  }

  /**
   * Approve a pending plan from a chat reply: open the build gate, keep the SAME
   * plan on screen as a live checklist, and run the build turn. `userText` is
   * the user's actual approval message, shown in the transcript.
   */
  function startBuild(plan: PlanProposal, userText: string) {
    setPendingPlan(null);
    confirmedRef.current = true;
    // Remember the plan + reset the fix budget so the post-build review can
    // compare the result against it.
    confirmedPlanRef.current = plan;
    selfFixCountRef.current = 0;
    setBuildPlan(plan);
    setBuildPhase("building");
    setCompletedSteps(0);
    // Hidden directive: tell the model the plan is approved and to build NOW with
    // the build tools — never re-emit the plan as text/JSON. A bare "yes" alone
    // sometimes makes the model dump the plan JSON instead of building.
    const planText = `${plan.summary}\n${plan.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n")}`;
    const history: ChatItem[] = [
      ...messages,
      { id: uuid(), role: "user", text: userText },
      {
        id: uuid(),
        role: "user",
        text: t("chat.plan.confirmed", { plan: planText }),
        hidden: true,
      },
    ];
    setMessages(history);
    void runAssistant(history);
  }

  /** Review: user confirms the build is correct — end the build lifecycle. */
  function acceptBuild() {
    if (sending) {
      return;
    }
    setBuildPhase(null);
    setBuildPlan(null);
    confirmedRef.current = false;
    confirmedPlanRef.current = null;
  }

  /**
   * Review: user reports the build is wrong. Reopen the gate and run a hidden
   * root-cause fix turn against the approved plan; the result returns to review.
   */
  function rejectBuild() {
    const plan = confirmedPlanRef.current;
    if (sending || !plan || selfFixCountRef.current >= MAX_SELF_FIX) {
      return;
    }
    selfFixCountRef.current += 1;
    confirmedRef.current = true; // reopen the gate for the fix turn
    setBuildPhase("fixing");
    const planText = `${plan.summary}\n${plan.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n")}`;
    const history: ChatItem[] = [
      ...messages,
      {
        id: uuid(),
        role: "user",
        text: `${t("chat.review.fixRequest")} ${t("chat.plan.selfFix", {
          plan: planText,
        })}`,
        hidden: true,
      },
    ];
    setMessages(history);
    void runAssistant(history);
  }

  /** Clear the transcript and cancel any in-flight request. */
  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setSending(false);
    setPendingPlan(null);
    confirmedRef.current = false;
    confirmedPlanRef.current = null;
    selfFixCountRef.current = 0;
    setBuildPlan(null);
    setBuildPhase(null);
    setCompletedSteps(0);
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
              {messages
                .filter((m) => !m.hidden)
                .map((message) => (
                  <MessageRow key={message.id} message={message} t={t} />
                ))}
              {sending && <ThinkingRow label={t("chat.thinking")} />}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t-2 border-foreground bg-background p-3 sm:p-4">
        <div className="mx-auto max-w-4xl">
          {buildPlan && buildPhase === "building" && (
            <BuildProgressCard
              plan={buildPlan}
              completed={completedSteps}
              t={t}
            />
          )}
          {buildPhase === "fixing" && <FixingCard t={t} />}
          {buildPlan && buildPhase === "review" && (
            <BuildReviewCard
              disabled={sending}
              onAccept={acceptBuild}
              onReject={rejectBuild}
              t={t}
            />
          )}
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
            {sending ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={stop}
                aria-label={t("chat.stop")}
              >
                <Square className="fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={() => send(input)}
                disabled={!input.trim()}
                aria-label={t("chat.send")}
              >
                <SendHorizontal />
              </Button>
            )}
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

/**
 * Live build checklist shown after the user approves a plan. Renders the SAME
 * approved plan (summary + ordered steps) and ticks each step as the assistant
 * adds its node, so the build screen mirrors exactly what was confirmed instead
 * of replacing it.
 *
 * @param props.plan - The approved plan being built.
 * @param props.completed - Number of steps finished so far.
 * @param props.t - Translator.
 */
function BuildProgressCard({
  plan,
  completed,
  t,
}: {
  plan: PlanProposal;
  completed: number;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <div className="mb-2 border-2 border-foreground bg-card p-3 shadow-nb-sm">
      <div className="flex items-center gap-2">
        <Loader2 size={15} className="shrink-0 animate-spin" />
        <span className="text-sm font-bold">{t("chat.build.title")}</span>
      </div>
      <p className="mt-1.5 text-sm">{plan.summary}</p>
      {plan.steps.length > 0 && (
        <ol className="mt-2 flex flex-col gap-1">
          {plan.steps.map((step, i) => {
            const done = i < completed;
            const active = i === completed;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 text-sm",
                  done || active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 size={15} className="text-primary" />
                  ) : active ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Circle size={15} />
                  )}
                </span>
                <span>
                  <span className="font-bold">
                    {t("chat.build.step", { n: i + 1 })}.
                  </span>{" "}
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/**
 * Shown while the assistant runs a root-cause fix after the user clicks
 * "No, fix it" on the review card.
 *
 * @param props.t - Translator.
 */
function FixingCard({ t }: { t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <div className="mb-2 flex items-center gap-2 border-2 border-foreground bg-amber-50 p-3 text-sm font-bold shadow-nb-sm dark:bg-amber-500/10">
      <Loader2 size={15} className="shrink-0 animate-spin" />
      {t("chat.review.fixing")}
    </div>
  );
}

/**
 * Post-build approval card: the build is done, so ask the user whether it is
 * correct. "Yes" ends the build; "No" triggers an automatic root-cause fix pass
 * against the approved plan, after which the user is asked again.
 *
 * @param props.disabled - Disable the actions while a request is in flight.
 * @param props.onAccept - User confirms the build is correct.
 * @param props.onReject - User reports the build is wrong → fix it.
 * @param props.t - Translator.
 */
function BuildReviewCard({
  disabled,
  onAccept,
  onReject,
  t,
}: {
  disabled: boolean;
  onAccept: () => void;
  onReject: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <div className="mb-2 border-2 border-foreground bg-card p-3 shadow-nb-sm">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={15} className="shrink-0 text-primary" />
        <span className="text-sm font-bold">{t("chat.review.title")}</span>
      </div>
      <p className="mt-1.5 text-sm">{t("chat.review.body")}</p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" onClick={onAccept} disabled={disabled}>
          {t("chat.review.yes")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={disabled}
        >
          {t("chat.review.no")}
        </Button>
      </div>
    </div>
  );
}
