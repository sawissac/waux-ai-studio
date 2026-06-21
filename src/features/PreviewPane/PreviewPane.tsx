"use client";

import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Markdown } from "@/components/ui/markdown";

/**
 * Normalize an author/state-supplied viewport URL for iframe embedding:
 * trim, prepend `https://` when no scheme is given, and reject anything that
 * isn't http(s) (blocks `javascript:` & friends). Returns `""` when unusable.
 */
function normalizeViewportUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

/**
 * Trigger a file download from the bound state value for a Download node.
 *
 * - `csv`: array via PapaParse.unparse, or string as-is.
 * - `md` / `svg`: state string → text file.
 * - `png` / `jpeg`: if state is a `data:image/…` URL download directly;
 *   otherwise attempt SVG → canvas → image.
 */
async function downloadFromState(
  content: unknown,
  format: DownloadNode["format"],
  baseName: string,
): Promise<void> {
  const name = (baseName || "export").trim();

  if (format === "csv") {
    let csvStr: string;
    if (Array.isArray(content)) {
      csvStr = Papa.unparse(content);
    } else {
      csvStr = typeof content === "string" ? content : JSON.stringify(content);
    }
    const blob = new Blob([csvStr], { type: "text/csv" });
    triggerDownload(URL.createObjectURL(blob), `${name}.csv`, true);
    return;
  }

  if (format === "md") {
    const str =
      typeof content === "string" ? content : JSON.stringify(content, null, 2);
    const blob = new Blob([str], { type: "text/markdown" });
    triggerDownload(URL.createObjectURL(blob), `${name}.md`, true);
    return;
  }

  if (format === "svg") {
    const str = typeof content === "string" ? content : String(content ?? "");
    const blob = new Blob([str], { type: "image/svg+xml" });
    triggerDownload(URL.createObjectURL(blob), `${name}.svg`, true);
    return;
  }

  // png / jpeg
  const str = typeof content === "string" ? content : "";
  if (str.startsWith("data:image/")) {
    triggerDownload(str, `${name}.${format}`, false);
    return;
  }
  // Attempt SVG string → canvas → image
  try {
    const svgBlob = new Blob([str], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);
        const mime = format === "jpeg" ? "image/jpeg" : "image/png";
        triggerDownload(canvas.toDataURL(mime), `${name}.${format}`, false);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("image load failed"));
      };
      img.src = svgUrl;
    });
  } catch {
    // Nothing useful to download; silently no-op.
  }
}

/** Create a temporary anchor and click it to trigger a browser file download. */
function triggerDownload(href: string, filename: string, revoke: boolean) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) {
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  }
}

/**
 * Resolve a Select node's runtime options. When `bound` (the value of its
 * options-binding state slot) is an array it wins — strings become
 * `value === label`, `{ value, label }` objects are passed through — otherwise
 * the node's static `options` list is used.
 */
function resolveSelectOptions(
  node: SelectNode,
  bound: unknown,
): { value: string; label: string }[] {
  if (Array.isArray(bound)) {
    return bound.map((o) => {
      if (o && typeof o === "object") {
        const rec = o as Record<string, unknown>;
        const value = String(rec.value ?? rec.label ?? "");
        return { value, label: String(rec.label ?? rec.value ?? value) };
      }
      const value = String(o ?? "");
      return { value, label: value };
    });
  }
  return node.options.map((o: SelectOption) => ({
    value: o.value,
    label: o.label || o.value,
  }));
}

import Papa from "papaparse";

import { CodeEditor } from "@/components/ui/code-editor";
import {
  DATE_INPUT_TYPE,
  EDITOR_HEIGHTS,
  VIEWPORT_DEVICES,
} from "@/constants/tool-builder";
import { ChartView } from "@/features/PreviewPane/components/ChartView";
import { ConvertHtmlSite } from "@/features/PreviewPane/components/ConvertHtmlSite";
import { DataTable } from "@/features/PreviewPane/components/DataTable";
import {
  DeviceFrame,
  DeviceToggle,
} from "@/features/PreviewPane/components/DeviceFrame";
import { SpriteView } from "@/features/PreviewPane/components/SpriteView";
import { ThemedSite } from "@/features/PreviewPane/components/ThemedSite";
import { VaultView } from "@/features/PreviewPane/components/VaultView";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import { parseCsv } from "@/lib/csv";
import {
  changeChain,
  initialStateMap,
  resetChain,
  resolveBinding,
  runChain,
  type StateMap,
} from "@/lib/tool-builder-runtime";
import { cn } from "@/lib/utils";
import type {
  CsvNode,
  DownloadNode,
  FileNode,
  SelectNode,
  SelectOption,
  StateNode,
  Tool,
  ViewportDevice,
  ViewportNode,
} from "@/types/tool-builder";
import { isRenderNode } from "@/types/tool-builder";

/**
 * Seed the preview's shared simulated screen from the first website node's
 * configured default screen. All website frames then switch together.
 */
function firstWebsiteDevice(tool: Tool): ViewportDevice {
  for (const n of tool.nodes) {
    if (
      n.type === "viewport" ||
      n.type === "convert_html" ||
      n.type === "themed"
    ) {
      return n.device ?? "responsive";
    }
  }
  return "responsive";
}

/**
 * Placeholder shown for a website node whose live preview is switched off.
 * Skips loading the iframe/network until the author enables it.
 *
 * @param props.height - Matches the node's frame height so the layout is stable.
 * @param props.onEnable - Flip the node's `previewEnabled` flag on.
 */
function PreviewOffNotice({
  height,
  onEnable,
}: {
  height: number;
  onEnable: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      style={{ height }}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 text-center text-xs text-muted-foreground"
    >
      <EyeOff size={20} className="opacity-30" />
      <span>{t("preview.off")}</span>
      <button
        type="button"
        onClick={onEnable}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-[11px] font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Eye size={12} /> {t("preview.enable")}
      </button>
    </div>
  );
}

/**
 * Live preview — what the end user of the tool sees, fully interactive.
 *
 * Maintains a runtime copy of the shared state seeded from the state node's
 * defaults. Input nodes write to their bound slot and (for run-triggering
 * inputs) execute the code-node chain via {@link runChain}; textarea inputs are
 * two-way bound. Re-seeds when the open tool changes and back-fills any
 * newly-added state slots.
 *
 * @param props.tool - The open tool to render & run.
 * @param props.stateNode - Tool state node providing slot defaults.
 */
export function PreviewPane({
  tool,
  stateNode,
}: {
  tool: Tool;
  stateNode: StateNode | null;
}) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const [runtime, setRuntime] = useState<StateMap>(() =>
    initialStateMap(stateNode),
  );
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  /** Per-markdown-node view mode (write source vs. rendered preview). */
  const [mdMode, setMdMode] = useState<Record<string, "write" | "preview">>({});
  /** Shared simulated screen — every website frame switches together. */
  const [previewDevice, setPreviewDevice] = useState<ViewportDevice>(() =>
    firstWebsiteDevice(tool),
  );
  /** Per-csv-node upload metadata (file name, parsed shape, parse error). */
  const [csvMeta, setCsvMeta] = useState<
    Record<
      string,
      {
        fileName: string;
        rowCount: number;
        fields: string[];
        error: string | null;
      }
    >
  >({});

  // Full reset when switching tools.
  useEffect(() => {
    setRuntime(initialStateMap(stateNode));
    setInputs({});
    setMdMode({});
    setPreviewDevice(firstWebsiteDevice(tool));
    setCsvMeta({});
  }, [tool.id]);

  const debouncedChange = useDebouncedCallback(
    async (startingState: StateMap) => {
      const nextState = await changeChain(tool, startingState, stateNode);
      setRuntime(nextState);
    },
    300,
  );

  // Back-fill defaults for newly-added state slots without wiping live values.
  const stateKey = (stateNode?.states ?? [])
    .map((s) => `${s.name}=${s.value}`)
    .join("|");
  useEffect(() => {
    setRuntime((prev) => {
      const next = { ...prev };
      for (const s of stateNode?.states ?? []) {
        if (!(s.name in next)) {
          next[s.name] = s.value;
        }
      }
      return next;
    });
  }, [stateKey]);

  /**
   * Write `value` to `name`, then run the code + AI chain. When `targets` is
   * non-empty, only those code/AI nodes run.
   */
  const trigger = async (name: string, value: string, targets?: string[]) => {
    const startingState = { ...runtime, [name]: value };
    setRuntime(startingState);
    setRunError(null);
    setRunning(true);
    try {
      const nextState = await runChain(
        tool,
        startingState,
        stateNode,
        (msg) => setRunError(msg),
        targets,
      );
      setRuntime(nextState);
    } finally {
      setRunning(false);
    }
  };

  /**
   * Run the chain over current state without writing a fresh input. When
   * `targets` is non-empty, only those code/AI nodes run.
   */
  const runNow = async (targets?: string[]) => {
    setRunError(null);
    setRunning(true);
    try {
      const nextState = await runChain(
        tool,
        runtime,
        stateNode,
        (msg) => setRunError(msg),
        targets,
      );
      setRuntime(nextState);
    } finally {
      setRunning(false);
    }
  };

  /**
   * Reset the chain over current state. When `targets` is non-empty, only those
   * code nodes' `reset()` run (mirrors {@link runNow} targeting).
   */
  const resetNow = async (targets?: string[]) => {
    const nextState = await resetChain(tool, { ...runtime }, targets);
    setRuntime(nextState);
  };

  const setInput = (id: string, v: string) =>
    setInputs((prev) => ({ ...prev, [id]: v }));

  /**
   * Parse an uploaded CSV file and write the optimized rows array into the
   * node's bound state slot, then run the live `change` chain. Parse errors
   * are surfaced inline on the node; nothing is written on failure.
   */
  const loadCsv = async (node: CsvNode, file: File) => {
    const name = resolveBinding(node.binding, stateNode);
    const text = await file.text();
    const result = parseCsv(text, node.hasHeader);
    setCsvMeta((prev) => ({
      ...prev,
      [node.id]: {
        fileName: file.name,
        rowCount: result.rowCount,
        fields: result.fields,
        error: result.error,
      },
    }));
    if (result.error || !name) {
      return;
    }
    const nextState = { ...runtime, [name]: result.rows };
    setRuntime(nextState);
    debouncedChange(nextState);
  };

  /**
   * Read an uploaded file with the encoding `node.outputFormat` requires and
   * write the encoded string to the node's bound state slot, then run the live
   * `change` chain. Used by both the File upload (text/base64/dataurl) and the
   * Image upload (always a data URL) nodes.
   */
  const loadFile = async (
    name: string,
    file: File,
    format: FileNode["outputFormat"],
  ) => {
    if (!name) {
      return;
    }
    let encoded: string;
    if (format === "text") {
      encoded = await file.text();
    } else {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      // `base64` strips the `data:…;base64,` prefix; `dataurl` keeps it.
      encoded =
        format === "base64"
          ? dataUrl.replace(/^data:[^;]*;base64,/, "")
          : dataUrl;
    }
    const nextState = { ...runtime, [name]: encoded };
    setRuntime(nextState);
    debouncedChange(nextState);
  };

  const aiMarkdownNodes = useMemo(
    () =>
      tool.nodes.filter(
        (n) => n.type === "ai" && n.markdownOutput,
      ) as import("@/types/tool-builder").AiNode[],
    [tool.nodes],
  );

  const markdownStates = useMemo(() => {
    const set = new Set<string>();
    for (const n of aiMarkdownNodes) {
      const name = resolveBinding(n.output, stateNode);
      if (name) {
        set.add(name);
      }
    }
    return set;
  }, [aiMarkdownNodes, stateNode]);

  const renderNodes = tool.nodes.filter(isRenderNode);

  return (
    <div className="mt-10 font-display">
      <div className="mb-5 flex items-center gap-3 border-2 border-foreground bg-card px-3 py-2.5 shadow-nb">
        <span className="grid size-8 shrink-0 place-items-center border-2 border-foreground bg-primary text-primary-foreground shadow-nb-sm">
          <Eye size={16} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-bold">{t("preview.title")}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {t("preview.subtitle")}
          </span>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 border-2 border-foreground bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-nb-sm">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          {t("preview.live")}
        </span>
      </div>
      {running && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 size={13} className="animate-spin" />
          {t("preview.running")}
        </div>
      )}
      {runError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          <span className="min-w-0 wrap-break-word">{runError}</span>
        </div>
      )}
      <div className="w-full pt-2">
        <div className="w-full">
          {renderNodes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 py-12 text-center text-sm text-muted-foreground">
              <Eye size={24} className="opacity-20" />
              <div>{t("preview.empty")}</div>
            </div>
          ) : (
            <ErrorBoundary
              resetKeys={[renderNodes.map((n) => n.id).join(",")]}
              fallback={(_e, reset) => (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-destructive/40 py-10 text-center text-sm text-muted-foreground">
                  <div>Preview hit an error.</div>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent"
                  >
                    Retry
                  </button>
                </div>
              )}
            >
              <div className="flex flex-col gap-6">
                {renderNodes.map((node, nodeIndex) => {
                  if (node.type === "button") {
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        {node.fieldLabel && (
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                        )}
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => runNow(node.targets)}
                            disabled={running}
                            className="inline-flex h-10 shrink-0 items-center justify-center border-2 border-foreground bg-primary px-4 text-sm font-bold text-primary-foreground shadow-nb nb-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                          >
                            {node.buttonText}
                          </button>
                          {node.resetEnabled && (
                            <button
                              type="button"
                              onClick={() => resetNow(node.resetTargets)}
                              className="inline-flex h-10 shrink-0 items-center justify-center border-2 border-foreground bg-background px-4 text-sm font-bold shadow-nb nb-press hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            >
                              {node.resetText}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (node.type === "convert_html") {
                    const sourceVp = (
                      node.source
                        ? tool.nodes.find(
                            (n) =>
                              n.id === node.source && n.type === "viewport",
                          )
                        : tool.nodes.find((n) => n.type === "viewport")
                    ) as ViewportNode | undefined;
                    let sourceUrl = "";
                    if (sourceVp) {
                      const vpName = resolveBinding(
                        sourceVp.binding,
                        stateNode,
                      );
                      const vpRaw = vpName ? runtime[vpName] : "";
                      const vpOverride = typeof vpRaw === "string" ? vpRaw : "";
                      sourceUrl = normalizeViewportUrl(
                        vpOverride || sourceVp.url,
                      );
                    }
                    const outName = resolveBinding(node.binding, stateNode);
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        {node.fieldLabel && (
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                        )}
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        {node.previewEnabled ? (
                          <ConvertHtmlSite
                            url={sourceUrl}
                            height={
                              node.editorHeight ??
                              EDITOR_HEIGHTS.defaults.convert_html
                            }
                            hasSource={!!sourceVp}
                            device={previewDevice}
                            onDeviceChange={setPreviewDevice}
                            outputName={outName}
                            onHtml={(html) => {
                              if (!outName) {
                                return;
                              }
                              setRuntime((prev) => {
                                const nextState = { ...prev, [outName]: html };
                                debouncedChange(nextState);
                                return nextState;
                              });
                            }}
                          />
                        ) : (
                          <PreviewOffNotice
                            height={
                              node.editorHeight ??
                              EDITOR_HEIGHTS.defaults.convert_html
                            }
                            onEnable={() =>
                              updateNode(node.id, { previewEnabled: true })
                            }
                          />
                        )}
                      </div>
                    );
                  }

                  if (node.type === "themed") {
                    const htmlName = resolveBinding(node.binding, stateNode);
                    const htmlRaw = htmlName ? runtime[htmlName] : "";
                    const html = typeof htmlRaw === "string" ? htmlRaw : "";
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        {node.fieldLabel && (
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                        )}
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        {node.previewEnabled ? (
                          <ThemedSite
                            html={html}
                            height={
                              node.editorHeight ??
                              EDITOR_HEIGHTS.defaults.themed
                            }
                            hasBinding={!!htmlName}
                            device={previewDevice}
                            onDeviceChange={setPreviewDevice}
                          />
                        ) : (
                          <PreviewOffNotice
                            height={
                              node.editorHeight ??
                              EDITOR_HEIGHTS.defaults.themed
                            }
                            onEnable={() =>
                              updateNode(node.id, { previewEnabled: true })
                            }
                          />
                        )}
                      </div>
                    );
                  }

                  if (node.type === "counter") {
                    const outName = resolveBinding(node.output, stateNode);
                    const raw = outName ? runtime[outName] : undefined;
                    const counts =
                      raw !== null &&
                      typeof raw === "object" &&
                      !Array.isArray(raw)
                        ? (raw as Record<string, unknown>)
                        : {};
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        {node.fieldLabel && (
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                        )}
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        {node.modes.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border/50 px-4 py-6 text-center text-xs text-muted-foreground">
                            {t("counter.empty")}
                          </div>
                        ) : node.modes.length > 6 ? (
                          // Many metrics — collapse into one combined container
                          // with dense label/value rows instead of large cards.
                          <div className="grid grid-cols-2 gap-x-px gap-y-px border-2 border-foreground bg-foreground shadow-nb sm:grid-cols-3">
                            {node.modes.map((m) => (
                              <div
                                key={m}
                                className="flex items-center justify-between gap-2 bg-card px-3 py-2 leading-tight"
                              >
                                <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t(`counter.mode.${m}`)}
                                </span>
                                <span className="shrink-0 font-display text-base font-extrabold tabular-nums">
                                  {String(counts[m] ?? 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {node.modes.map((m) => (
                              <div
                                key={m}
                                className="flex flex-col gap-0.5 border-2 border-foreground bg-card px-3 py-2.5 leading-tight shadow-nb"
                              >
                                <span className="font-display text-xl font-extrabold tabular-nums">
                                  {String(counts[m] ?? 0)}
                                </span>
                                <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t(`counter.mode.${m}`)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (node.type === "vault") {
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        {node.fieldLabel && (
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                        )}
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <VaultView node={node} />
                      </div>
                    );
                  }

                  const name = resolveBinding(node.binding, stateNode);

                  if (node.type === "viewport") {
                    const raw = name ? runtime[name] : "";
                    const override = typeof raw === "string" ? raw : "";
                    const src = normalizeViewportUrl(override || node.url);
                    const height =
                      node.editorHeight ?? EDITOR_HEIGHTS.defaults.viewport;
                    const device = previewDevice;
                    const dims = VIEWPORT_DEVICES.find(
                      (d) => d.value === device && d.width,
                    );
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                          {node.previewEnabled && (
                            <DeviceToggle
                              value={device}
                              onChange={setPreviewDevice}
                            />
                          )}
                        </div>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        {!node.previewEnabled ? (
                          <PreviewOffNotice
                            height={height}
                            onEnable={() =>
                              updateNode(node.id, { previewEnabled: true })
                            }
                          />
                        ) : src ? (
                          <>
                            <DeviceFrame
                              src={src}
                              title={
                                node.fieldLabel || t("preview.viewport.title")
                              }
                              device={device}
                              height={height}
                            />
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {src}
                              {dims && ` · ${dims.width}×${dims.height}`}
                            </p>
                          </>
                        ) : (
                          <div
                            style={{ height }}
                            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground"
                          >
                            <Globe size={20} className="opacity-30" />
                            {override || node.url
                              ? t("preview.viewport.invalid")
                              : t("preview.viewport.setUrl")}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (node.type === "number") {
                    const raw = runtime[name];
                    const num = Number(raw);
                    const value = Number.isFinite(num) ? num : node.min;
                    const write = (v: number) => {
                      const nextState = { ...runtime, [name]: String(v) };
                      setRuntime(nextState);
                      debouncedChange(nextState);
                    };
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={node.min}
                            max={node.max}
                            step={node.step}
                            value={value}
                            onChange={(e) => write(Number(e.target.value))}
                            className="h-2 flex-1 cursor-pointer accent-primary"
                          />
                          <input
                            type="number"
                            min={node.min}
                            max={node.max}
                            step={node.step}
                            value={value}
                            onChange={(e) => write(Number(e.target.value))}
                            className="h-10 w-24 shrink-0 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (node.type === "select") {
                    const optName = resolveBinding(
                      node.optionsBinding,
                      stateNode,
                    );
                    const bound = optName ? runtime[optName] : undefined;
                    const options = resolveSelectOptions(node, bound);
                    const current = runtime[name] ?? "";
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <select
                          value={String(current)}
                          onChange={(e) => {
                            const nextState = {
                              ...runtime,
                              [name]: e.target.value,
                            };
                            setRuntime(nextState);
                            debouncedChange(nextState);
                          }}
                          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">
                            {t("preview.select.placeholder")}
                          </option>
                          {options.map((o, i) => (
                            <option key={`${o.value}-${i}`} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (node.type === "toggle") {
                    const checked =
                      runtime[name] === "true" || runtime[name] === true;
                    return (
                      <div
                        key={node.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 flex-col">
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                          {node.description && (
                            <p className="text-xs text-muted-foreground">
                              {node.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          onClick={() => {
                            const nextState = {
                              ...runtime,
                              [name]: String(!checked),
                            };
                            setRuntime(nextState);
                            debouncedChange(nextState);
                          }}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-foreground transition-colors duration-(--motion-duration-fast)",
                            checked ? "bg-primary" : "bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block size-4 transform rounded-full bg-background shadow-sm transition-transform duration-(--motion-duration-fast)",
                              checked ? "translate-x-5" : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </div>
                    );
                  }

                  if (node.type === "date") {
                    const current = runtime[name] ?? "";
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <input
                          type={DATE_INPUT_TYPE[node.mode]}
                          value={String(current)}
                          onChange={(e) => {
                            const nextState = {
                              ...runtime,
                              [name]: e.target.value,
                            };
                            setRuntime(nextState);
                            debouncedChange(nextState);
                          }}
                          className="h-10 w-fit rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    );
                  }

                  if (node.type === "file") {
                    const has = !!runtime[name];
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <label className="relative inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-within:ring-1 focus-within:ring-ring">
                          <Upload size={14} className="shrink-0" />
                          <span className="max-w-60 truncate">
                            {has
                              ? t("preview.file.loaded")
                              : t("preview.file.choose")}
                          </span>
                          <input
                            type="file"
                            accept={node.accept || undefined}
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                loadFile(name, file, node.outputFormat);
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    );
                  }

                  if (node.type === "image") {
                    const raw = runtime[name];
                    const src = typeof raw === "string" ? raw : "";
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <label className="relative inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-within:ring-1 focus-within:ring-ring">
                          <Upload size={14} className="shrink-0" />
                          <span className="max-w-60 truncate">
                            {src
                              ? t("preview.image.change")
                              : t("preview.image.choose")}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                loadFile(name, file, "dataurl");
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {src && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt={node.fieldLabel}
                            className="max-h-64 w-fit max-w-full rounded-xl border border-input object-contain shadow-sm"
                          />
                        )}
                      </div>
                    );
                  }

                  if (node.type === "textarea") {
                    const isMarkdown = markdownStates.has(name);
                    const currentValue = runtime[name] ?? "";
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        {isMarkdown && currentValue ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm">
                            <Markdown content={currentValue} />
                          </div>
                        ) : (
                          <textarea
                            style={{
                              height:
                                node.editorHeight ??
                                EDITOR_HEIGHTS.defaults.textarea,
                            }}
                            placeholder={node.placeholder}
                            value={currentValue}
                            onChange={(e) => {
                              const nextState = {
                                ...runtime,
                                [name]: e.target.value,
                              };
                              setRuntime(nextState);
                              debouncedChange(nextState);
                            }}
                            className="w-full resize-y rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                          />
                        )}
                      </div>
                    );
                  }

                  if (node.type === "json") {
                    const raw = runtime[name];
                    // Non-string state (e.g. a code node wrote an object) is
                    // surfaced pretty-printed so the user can keep editing it.
                    const currentValue =
                      typeof raw === "string"
                        ? raw
                        : raw === null || raw === undefined
                          ? ""
                          : JSON.stringify(raw, null, 2);
                    let jsonError: string | null = null;
                    if (currentValue.trim()) {
                      try {
                        JSON.parse(currentValue);
                      } catch (e) {
                        jsonError = e instanceof Error ? e.message : String(e);
                      }
                    }
                    return (
                      // Key by position so a reorder remounts Monaco instead of
                      // React reparenting its live DOM (which leaves Monaco's
                      // scheduled render pointing at a detached node → "domNode"
                      // undefined crash).
                      <div
                        key={`${node.id}-${nodeIndex}`}
                        className="flex flex-col gap-2"
                      >
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        <CodeEditor
                          language="json"
                          height={
                            node.editorHeight ?? EDITOR_HEIGHTS.defaults.json
                          }
                          aiEnabled={false}
                          autoFocus={false}
                          value={currentValue}
                          onChange={(v) => {
                            const nextState = { ...runtime, [name]: v };
                            setRuntime(nextState);
                            debouncedChange(nextState);
                          }}
                        />
                        {jsonError && (
                          <p className="flex items-start gap-1.5 text-[11px] text-destructive">
                            <AlertTriangle
                              size={12}
                              className="mt-px shrink-0"
                            />
                            <span className="min-w-0 wrap-break-word">
                              {t("preview.json.invalid", { msg: jsonError })}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  }

                  if (node.type === "csv") {
                    const meta = csvMeta[node.id];
                    const data = runtime[name];
                    const rows = Array.isArray(data) ? data : [];
                    const fields = (meta?.fields ?? []).slice(0, 6);
                    const sample = rows.slice(0, 5);
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        <label className="relative inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-within:ring-1 focus-within:ring-ring">
                          <Upload size={14} className="shrink-0" />
                          <span className="max-w-60 truncate">
                            {meta?.fileName ?? t("preview.csv.choose")}
                          </span>
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                loadCsv(node, file);
                              }
                              // Allow re-uploading the same file.
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {meta?.error && (
                          <p className="flex items-start gap-1.5 text-[11px] text-destructive">
                            <AlertTriangle
                              size={12}
                              className="mt-px shrink-0"
                            />
                            <span className="min-w-0 wrap-break-word">
                              {t("preview.csv.invalid", { msg: meta.error })}
                            </span>
                          </p>
                        )}
                        {meta && !meta.error && (
                          <p className="text-[11px] text-muted-foreground">
                            {t("preview.csv.summary", {
                              rows: meta.rowCount,
                              cols: meta.fields.length,
                            })}
                          </p>
                        )}
                        {sample.length > 0 && fields.length > 0 && (
                          <div className="overflow-x-auto rounded-xl border border-input shadow-sm">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/60 bg-muted/40 text-left">
                                  {fields.map((f) => (
                                    <th
                                      key={f}
                                      className="max-w-40 truncate px-2.5 py-1.5 font-semibold"
                                    >
                                      {f}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sample.map((row, ri) => (
                                  <tr
                                    key={ri}
                                    className="border-b border-border/40 last:border-0"
                                  >
                                    {fields.map((f, ci) => {
                                      const cell = node.hasHeader
                                        ? (row as Record<string, unknown>)[f]
                                        : (row as unknown[])[ci];
                                      return (
                                        <td
                                          key={f}
                                          className="max-w-40 truncate px-2.5 py-1.5 text-muted-foreground"
                                        >
                                          {cell === null || cell === undefined
                                            ? ""
                                            : String(cell)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {rows.length > sample.length && (
                              <div className="border-t border-border/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                                {t("preview.csv.more", {
                                  n: rows.length - sample.length,
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (node.type === "download") {
                    const content = name ? runtime[name] : undefined;
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        {node.fieldLabel && (
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                        )}
                        {node.description && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            {node.description}
                          </p>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              downloadFromState(
                                content,
                                node.format,
                                node.fileName,
                              )
                            }
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border-2 border-foreground bg-primary px-4 text-sm font-bold text-primary-foreground shadow-nb nb-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                          >
                            <Download size={14} aria-hidden />
                            {node.buttonText}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (node.type === "table") {
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        <DataTable
                          value={runtime[name]}
                          pageSize={node.pageSize}
                        />
                      </div>
                    );
                  }

                  if (node.type === "chart") {
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        <ChartView node={node} value={runtime[name]} />
                      </div>
                    );
                  }

                  if (node.type === "sprite") {
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        {node.fieldLabel && (
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                        )}
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        <SpriteView
                          node={node}
                          runtime={runtime}
                          stateNode={stateNode}
                        />
                      </div>
                    );
                  }

                  if (node.type === "code_input") {
                    const raw = runtime[name];
                    const currentValue =
                      typeof raw === "string"
                        ? raw
                        : raw === null || raw === undefined
                          ? ""
                          : String(raw);
                    return (
                      // Position-keyed: remount Monaco on reorder (see json branch).
                      <div
                        key={`${node.id}-${nodeIndex}`}
                        className="flex flex-col gap-2"
                      >
                        <label className="text-sm font-semibold">
                          {node.fieldLabel}
                        </label>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        <CodeEditor
                          language={node.language}
                          height={
                            node.editorHeight ??
                            EDITOR_HEIGHTS.defaults.code_input
                          }
                          aiEnabled={false}
                          autoFocus={false}
                          value={currentValue}
                          onChange={(v) => {
                            const nextState = { ...runtime, [name]: v };
                            setRuntime(nextState);
                            debouncedChange(nextState);
                          }}
                        />
                      </div>
                    );
                  }

                  if (node.type === "markdown") {
                    const currentValue = runtime[name] ?? "";
                    const mode = mdMode[node.id] ?? "preview";
                    return (
                      <div key={node.id} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-semibold">
                            {node.fieldLabel}
                          </label>
                          <div className="inline-flex shrink-0 rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
                            {(["write", "preview"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() =>
                                  setMdMode((prev) => ({
                                    ...prev,
                                    [node.id]: m,
                                  }))
                                }
                                className={cn(
                                  "rounded-md px-2.5 py-1 font-medium capitalize transition-colors duration-(--motion-duration-fast)",
                                  mode === m
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        {node.description && (
                          <p className="text-xs text-muted-foreground -mt-1">
                            {node.description}
                          </p>
                        )}
                        {mode === "preview" ? (
                          <div
                            style={{
                              minHeight:
                                node.editorHeight ??
                                EDITOR_HEIGHTS.defaults.markdown,
                            }}
                            className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm"
                          >
                            {currentValue ? (
                              <Markdown content={currentValue} />
                            ) : (
                              <span className="text-muted-foreground">
                                {t("preview.markdown.empty")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <textarea
                            style={{
                              height:
                                node.editorHeight ??
                                EDITOR_HEIGHTS.defaults.markdown,
                            }}
                            placeholder={node.placeholder}
                            value={currentValue}
                            onChange={(e) => {
                              const nextState = {
                                ...runtime,
                                [name]: e.target.value,
                              };
                              setRuntime(nextState);
                              debouncedChange(nextState);
                            }}
                            className="w-full resize-y rounded-xl border border-input bg-transparent px-4 py-3 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                          />
                        )}
                      </div>
                    );
                  }

                  // text_run
                  const value = inputs[node.id] ?? "";
                  const submit = () => {
                    trigger(name, value, node.targets);
                    if (node.resetEnabled) {
                      setInput(node.id, "");
                    }
                  };

                  return (
                    <div key={node.id} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold">
                        {node.fieldLabel}
                      </label>
                      {node.description && (
                        <p className="text-xs text-muted-foreground -mt-1">
                          {node.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <input
                          value={value}
                          placeholder={node.placeholder}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            setInput(node.id, newVal);
                            const nextState = { ...runtime, [name]: newVal };
                            setRuntime(nextState);
                            debouncedChange(nextState);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && node.runEnabled) {
                              submit();
                            }
                          }}
                          className="h-10 flex-1 min-w-50 rounded-lg border border-input bg-transparent px-3.5 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        {node.runEnabled && (
                          <button
                            type="button"
                            onClick={submit}
                            className="h-10 shrink-0 inline-flex items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                          >
                            {node.buttonText}
                          </button>
                        )}
                        {node.resetEnabled && (
                          <button
                            type="button"
                            onClick={async () => {
                              setInput(node.id, "");
                              const startingState = { ...runtime };
                              const nextState = await resetChain(
                                tool,
                                startingState,
                                node.resetTargets,
                              );
                              setRuntime(nextState);
                            }}
                            className="h-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                          >
                            {node.resetText}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {aiMarkdownNodes.map((node) => {
                  const name = resolveBinding(node.output, stateNode);
                  const content = name ? (runtime[name] ?? "") : "";
                  return (
                    <div key={node.id} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold">
                        {t("preview.ai.title")}
                      </label>
                      {content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm">
                          <Markdown content={content} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 py-8 text-xs text-muted-foreground">
                          {t("preview.ai.empty")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
