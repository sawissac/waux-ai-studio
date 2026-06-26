"use client";

/**
 * Preview renderer for the Tool Builder's Speech to Text node.
 *
 * Listens to the microphone with the browser Speech Recognition engine (via
 * `react-speech-recognition`) and writes the live transcript back into the
 * node's bound state slot through `onChange`, so downstream nodes can consume
 * the dictated text. Renders a record / stop control plus the running
 * transcript. Browsers without Speech Recognition support show an inline
 * notice.
 */
import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import { useTranslation } from "@/hooks/useTranslation";
import type { SttNode } from "@/types/tool-builder";

const btnCls =
  "inline-flex items-center gap-1.5 border-2 border-foreground px-3 py-1.5 text-xs font-semibold shadow-nb transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none disabled:active:translate-x-0 disabled:active:translate-y-0";

/**
 * Render a Speech to Text node's capture control.
 *
 * @param props.node - The STT node config (language, continuous).
 * @param props.value - The current value held in the node's bound state slot.
 * @param props.onChange - Writes a new transcript into the bound state slot.
 */
export function SttView({
  node,
  value,
  onChange,
}: {
  node: SttNode;
  value: unknown;
  onChange: (next: string) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Keep the latest onChange without re-firing the transcript effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Mirror the live transcript into the bound state slot while listening.
  useEffect(() => {
    if (listening) {
      onChangeRef.current(transcript);
    }
  }, [transcript, listening]);

  const text =
    typeof value === "string" ? value : value == null ? "" : String(value);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {t("stt.unsupported")}
      </div>
    );
  }

  const start = () => {
    resetTranscript();
    onChangeRef.current("");
    void SpeechRecognition.startListening({
      continuous: node.continuous,
      language: node.lang || "en-US",
    });
  };

  const stop = () => {
    void SpeechRecognition.stopListening();
  };

  return (
    <div className="flex flex-col gap-3 border-2 border-foreground bg-card p-3 shadow-nb">
      <div className="flex items-center gap-2">
        {listening ? (
          <button
            type="button"
            className={`${btnCls} bg-destructive text-destructive-foreground`}
            onClick={stop}
          >
            <MicOff size={14} />
            {t("stt.stop")}
          </button>
        ) : (
          <button
            type="button"
            className={`${btnCls} bg-background`}
            onClick={start}
          >
            <Mic size={14} />
            {t("stt.start")}
          </button>
        )}
        {listening && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-destructive" />
            {t("stt.listening")}
          </span>
        )}
      </div>
      <div className="min-h-12 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm leading-relaxed">
        {text || (
          <span className="text-muted-foreground">{t("stt.empty")}</span>
        )}
      </div>
    </div>
  );
}
