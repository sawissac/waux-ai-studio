"use client";

/**
 * Preview renderer for the Tool Builder's Mermaid (Diagram) node.
 *
 * Reads a Mermaid definition string from the node's bound state slot and renders
 * it to an SVG diagram with Mermaid (dynamically imported so its parser never
 * weighs down the initial bundle). Renders at `securityLevel: "strict"` so the
 * author's diagram text can't inject scripts. Empty input shows a placeholder;
 * a syntax error shows an inline message. The node never writes to state.
 */
import { AlertTriangle, Workflow } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import type { MermaidNode } from "@/types/tool-builder";

/**
 * Render a Mermaid node's diagram.
 *
 * @param props.node - The Mermaid node config (theme).
 * @param props.value - The raw value held in the node's bound state slot.
 */
export function MermaidView({
  node,
  value,
}: {
  node: MermaidNode;
  value: unknown;
}): React.ReactElement {
  const { t } = useTranslation();
  const source =
    typeof value === "string" ? value : value == null ? "" : String(value);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Mermaid renders into a temp element keyed by id; keep it unique + valid.
  const idBase = useId().replace(/[^a-zA-Z0-9]/g, "");
  const seq = useRef(0);

  useEffect(() => {
    const code = source.trim();
    if (!code) {
      setSvg("");
      setError(null);
      return;
    }
    let cancelled = false;
    const renderId = `mermaid-${idBase}-${seq.current++}`;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: node.theme,
          securityLevel: "strict",
        });
        const { svg: out } = await mermaid.render(renderId, code);
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg("");
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, node.theme, idBase]);

  if (!source.trim()) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-xs text-muted-foreground">
        <Workflow size={20} className="opacity-30" />
        {t("mermaid.empty")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <AlertTriangle size={13} className="mt-px shrink-0" />
        <span className="min-w-0 wrap-break-word">
          {t("mermaid.invalid", { msg: error })}
        </span>
      </div>
    );
  }

  return (
    <div
      className="grid place-items-center overflow-auto border-2 border-foreground bg-card p-4 shadow-nb [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid output is rendered with securityLevel "strict" (sanitized).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
