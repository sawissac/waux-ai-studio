"use client";

import { AlertTriangle, Check, Copy, Globe, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { VIEWPORT_DEVICES } from "@/constants/tool-builder";
import {
  DeviceFrame,
  DeviceToggle,
} from "@/features/PreviewPane/components/DeviceFrame";
import type { ViewportDevice } from "@/types/tool-builder";

/** How long the copy button shows its "copied" confirmation. */
const COPIED_MS = 1500;

/**
 * Convert to HTML node body: fetch the source View Port page through
 * `/api/site-proxy` (static snapshot — linked CSS inlined, scripts stripped),
 * hand the document to the tool via `onHtml` (PreviewPane writes it into the
 * bound state slot), and render the copied layout in a script-free sandboxed
 * frame with a copy-to-clipboard button.
 *
 * @param props.url - Normalized page URL from the source View Port ("" = none).
 * @param props.height - Frame height in px (`responsive` screen).
 * @param props.hasSource - Whether a View Port node exists to read from.
 * @param props.device - Simulated screen (shared across the preview's frames).
 * @param props.onDeviceChange - Switch the shared simulated screen.
 * @param props.outputName - Bound state slot name ("" = unbound).
 * @param props.onHtml - Receives the snapshot HTML ("" while empty/failed).
 */
export function ConvertHtmlSite({
  url,
  height,
  hasSource,
  device,
  onDeviceChange,
  outputName,
  onHtml,
}: {
  url: string;
  height: number;
  hasSource: boolean;
  device: ViewportDevice;
  onDeviceChange: (next: ViewportDevice) => void;
  outputName: string;
  onHtml: (html: string) => void;
}) {
  const [doc, setDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Latest callback without re-running the fetch effect when the parent
  // re-renders (PreviewPane recreates `onHtml` every render).
  const onHtmlRef = useRef(onHtml);
  onHtmlRef.current = onHtml;

  useEffect(() => {
    setDoc(null);
    setError(null);
    setCopied(false);
    onHtmlRef.current("");
    if (!url) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/site-proxy?url=${encodeURIComponent(url)}`)
      .then(async (res) => {
        const body = (await res.json()) as { html?: string; error?: string };
        if (!res.ok || typeof body.html !== "string") {
          throw new Error(body.error ?? `Request failed (${res.status}).`);
        }
        return body.html;
      })
      .then((h) => {
        if (!cancelled) {
          setDoc(h);
          onHtmlRef.current(h);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copyHtml = async () => {
    if (!doc) {
      return;
    }
    try {
      await navigator.clipboard.writeText(doc);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Clipboard API unavailable or write rejected — nothing to surface.
    }
  };

  const dims = VIEWPORT_DEVICES.find((d) => d.value === device && d.width);

  if (!hasSource || !url) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 text-center text-xs text-muted-foreground"
      >
        <Globe size={20} className="opacity-30" />
        {hasSource
          ? "Set a URL on the source View Port to copy its layout."
          : "Add a View Port node first — this node copies its page as HTML."}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/40 text-xs text-muted-foreground"
      >
        <Loader2 size={14} className="animate-spin" />
        Copying page layout & stylesheets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <AlertTriangle size={13} className="mt-px shrink-0" />
        <span className="min-w-0 wrap-break-word">{error}</span>
      </div>
    );
  }

  if (!doc) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={copyHtml}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-[0.98]"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy HTML"}
        </button>
        <DeviceToggle value={device} onChange={onDeviceChange} />
      </div>
      <DeviceFrame
        srcDoc={doc}
        title="Static HTML snapshot"
        device={device}
        height={height}
        sandbox=""
      />
      <p className="truncate font-mono text-[11px] text-muted-foreground">
        {url}
        {dims ? ` · ${dims.width}×${dims.height}` : ""} ·{" "}
        {Math.max(1, Math.round(doc.length / 1024))} KB ·{" "}
        {outputName ? `html → ${outputName}` : "no state bound"} · CSS inlined,
        scripts removed
      </p>
    </div>
  );
}
