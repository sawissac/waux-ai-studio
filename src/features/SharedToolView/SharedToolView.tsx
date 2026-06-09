"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, Loader2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { PreviewPane } from "@/features/PreviewPane";
import type { AiProvider , StateNode, Tool } from "@/types/tool-builder";

async function fetchSharedTool(toolId: string): Promise<Tool> {
  const res = await fetch(`/api/shared/${toolId}`);
  if (!res.ok) {throw new Error("not_found");}
  return res.json();
}

const LS_KEY: Record<AiProvider, string> = {
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

const PROVIDER_LABEL: Record<AiProvider, string> = {
  gemini: "Gemini API Key",
  openrouter: "OpenRouter API Key",
};

function readKey(provider: AiProvider): string {
  if (typeof window === "undefined") {return "";}
  return localStorage.getItem(LS_KEY[provider]) ?? "";
}

function writeKey(provider: AiProvider, value: string) {
  if (value) {localStorage.setItem(LS_KEY[provider], value);}
  else {localStorage.removeItem(LS_KEY[provider]);}
}

/**
 * Public share view — shows only the live preview for the given tool.
 * No builder UI is rendered; visitors can use the tool but not edit it.
 *
 * When the tool has AI nodes, a collapsible API key section is shown so
 * visitors can supply their own keys (stored in localStorage, never sent
 * to the server).
 *
 * @param props.toolId - The tool UUID from the share URL.
 */
export function SharedToolView({ toolId }: { toolId: string }) {
  const {
    data: tool,
    isLoading,
    isError,
  } = useQuery<Tool>({
    queryKey: ["shared-tool", toolId],
    queryFn: () => fetchSharedTool(toolId),
    retry: false,
  });

  const stateNode: StateNode | null = useMemo(
    () => (tool?.nodes.find((n) => n.type === "state") as StateNode) ?? null,
    [tool],
  );

  const aiProviders = useMemo<AiProvider[]>(() => {
    if (!tool) {return [];}
    const set = new Set<AiProvider>();
    for (const n of tool.nodes) {
      if (n.type === "ai") {set.add(n.provider);}
    }
    return [...set];
  }, [tool]);

  const [keys, setKeys] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (["gemini", "openrouter"] as AiProvider[]).map((p) => [p, readKey(p)]),
    ),
  );

  const handleKeyChange = (provider: AiProvider, value: string) => {
    writeKey(provider, value);
    setKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const inputCls =
    "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Wrench size={15} className="text-muted-foreground" />
        <span className="text-sm font-semibold">
          {isLoading ? (
            <span className="inline-block h-4 w-32 animate-pulse rounded bg-muted" />
          ) : tool ? (
            tool.name
          ) : (
            "Tool"
          )}
        </span>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading tool…
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/30 py-16 text-center text-sm text-muted-foreground">
              <AlertTriangle size={24} className="text-destructive/50" />
              <span>
                This tool is not available or the share link is invalid.
              </span>
            </div>
          )}

          {tool && (
            <>
              {aiProviders.length > 0 && (
                <div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <KeyRound size={13} />
                    API Keys
                  </div>
                  <div className="flex flex-col gap-3">
                    {aiProviders.map((provider) => (
                      <div key={provider} className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-foreground">
                          {PROVIDER_LABEL[provider]}
                        </label>
                        <input
                          type="password"
                          value={keys[provider]}
                          placeholder="Paste your key here…"
                          onChange={(e) =>
                            handleKeyChange(provider, e.target.value)
                          }
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground/70">
                    Keys are stored in your browser only and never sent to our
                    servers.
                  </p>
                </div>
              )}
              <PreviewPane tool={tool} stateNode={stateNode} />
            </>
          )}
        </div>
      </main>

      <footer className="flex h-10 shrink-0 items-center justify-center border-t">
        <span className="text-xs text-muted-foreground/50">
          Built with Toolkits
        </span>
      </footer>
    </div>
  );
}
