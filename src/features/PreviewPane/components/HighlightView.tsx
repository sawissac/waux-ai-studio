"use client";

/**
 * Preview renderer for the Tool Builder's Highlight (Code View) node.
 *
 * Reads a code string from the node's bound state slot and renders it as a
 * read-only, syntax-highlighted block with Shiki (the VS Code engine, loaded on
 * demand). The language and color theme come from the node config; an optional
 * line-number gutter is applied via the `.shiki-lines` CSS in globals. A copy
 * button lifts the raw source to the clipboard. The node never writes to state.
 */
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { CodeInputLanguage, HighlightNode } from "@/types/tool-builder";

/** Map a node language to a Shiki language id (Shiki treats text as plain). */
function shikiLang(language: CodeInputLanguage): string {
  return language === "plaintext" ? "text" : language;
}

/**
 * Render a Highlight node's code block.
 *
 * @param props.node - The Highlight node config (language, theme, lineNumbers).
 * @param props.value - The raw value held in the node's bound state slot.
 */
export function HighlightView({
  node,
  value,
}: {
  node: HighlightNode;
  value: unknown;
}): React.ReactElement {
  const { t } = useTranslation();
  const code =
    typeof value === "string" ? value : value == null ? "" : String(value);
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code.trim()) {
      setHtml("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const out = await codeToHtml(code, {
          lang: shikiLang(node.language),
          theme: node.theme,
        });
        if (!cancelled) {
          setHtml(out);
        }
      } catch {
        // Unknown grammar / load failure — fall back to plain, escaped text.
        if (!cancelled) {
          const escaped = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          setHtml(`<pre class="shiki"><code>${escaped}</code></pre>`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, node.language, node.theme]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard unavailable — leave state untouched.
    }
  };

  if (!code.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 px-4 py-6 text-center text-xs text-muted-foreground">
        {t("highlight.empty")}
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? t("highlight.copied") : t("highlight.copy")}
        title={copied ? t("highlight.copied") : t("highlight.copy")}
        className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-md border border-foreground/20 bg-background/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition-opacity duration-(--motion-duration-fast) hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 active:scale-95"
      >
        {copied ? (
          <Check size={13} className="text-primary" />
        ) : (
          <Copy size={13} />
        )}
      </button>
      <div
        className={cn(
          "max-h-96 overflow-auto border-2 border-foreground text-xs shadow-nb [&_pre]:m-0 [&_pre]:p-3.5 [&_pre]:leading-relaxed",
          node.lineNumbers && "shiki-lines",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
