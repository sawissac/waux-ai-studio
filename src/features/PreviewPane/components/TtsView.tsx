"use client";

/**
 * Preview renderer for the Tool Builder's Text to Speech node.
 *
 * Reads the string held in the node's bound state slot and speaks it aloud with
 * the browser Speech Synthesis engine (via `react-text-to-speech`). Renders
 * play / pause / stop controls and, when the node's `highlight` flag is on,
 * highlights each word as it is spoken. Empty input shows a placeholder; the
 * node never writes to state.
 */
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useSpeech } from "react-text-to-speech";

import { useTranslation } from "@/hooks/useTranslation";
import type { TtsNode } from "@/types/tool-builder";

const btnCls =
  "inline-flex items-center gap-1.5 border-2 border-foreground bg-background px-3 py-1.5 text-xs font-semibold shadow-nb transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none disabled:active:translate-x-0 disabled:active:translate-y-0";

/**
 * Render a Text to Speech node's player.
 *
 * @param props.node - The TTS node config (rate, pitch, volume, highlight).
 * @param props.value - The raw value held in the node's bound state slot.
 */
export function TtsView({
  node,
  value,
}: {
  node: TtsNode;
  value: unknown;
}): React.ReactElement {
  const { t } = useTranslation();
  const text =
    typeof value === "string" ? value : value == null ? "" : String(value);

  const { Text, speechStatus, start, pause, stop } = useSpeech({
    text,
    rate: node.rate,
    pitch: node.pitch,
    volume: node.volume,
    highlightText: node.highlight,
    highlightProps: {
      className: "bg-primary/30 rounded-[3px]",
    },
  });

  if (!text) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-xs text-muted-foreground">
        <Volume2 size={20} className="opacity-30" />
        {t("tts.empty")}
      </div>
    );
  }

  const isStarted = speechStatus === "started";
  const isPaused = speechStatus === "paused";

  return (
    <div className="flex flex-col gap-3 border-2 border-foreground bg-card p-3 shadow-nb">
      <div className="max-h-48 overflow-auto text-sm leading-relaxed">
        <Text />
      </div>
      <div className="flex items-center gap-2">
        {isStarted ? (
          <button type="button" className={btnCls} onClick={pause}>
            <Pause size={14} />
            {t("tts.pause")}
          </button>
        ) : (
          <button type="button" className={btnCls} onClick={start}>
            <Play size={14} />
            {isPaused ? t("tts.resume") : t("tts.play")}
          </button>
        )}
        <button
          type="button"
          className={btnCls}
          onClick={stop}
          disabled={speechStatus === "stopped"}
        >
          <Square size={14} />
          {t("tts.stop")}
        </button>
      </div>
    </div>
  );
}
