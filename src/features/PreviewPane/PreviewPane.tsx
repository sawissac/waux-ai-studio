"use client";

import { AlertTriangle, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import {
  changeChain,
  initialStateMap,
  resetChain,
  resolveBinding,
  runChain,
  type StateMap,
} from "@/lib/tool-builder-runtime";
import type { StateNode, Tool } from "@/types/tool-builder";
import { isRenderNode } from "@/types/tool-builder";

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
  const [runtime, setRuntime] = useState<StateMap>(() =>
    initialStateMap(stateNode),
  );
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Full reset when switching tools.
  useEffect(() => {
    setRuntime(initialStateMap(stateNode));
    setInputs({});
  }, [tool.id]);

  const debouncedChange = useDebouncedCallback(
    async (startingState: StateMap) => {
      const nextState = await changeChain(tool, startingState);
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

  /** Write `value` to `name`, then run the code + AI chain. */
  const trigger = async (name: string, value: string) => {
    const startingState = { ...runtime, [name]: value };
    setRuntime(startingState);
    setRunError(null);
    setRunning(true);
    try {
      const nextState = await runChain(tool, startingState, stateNode, (msg) =>
        setRunError(msg),
      );
      setRuntime(nextState);
    } finally {
      setRunning(false);
    }
  };

  const setInput = (id: string, v: string) =>
    setInputs((prev) => ({ ...prev, [id]: v }));

  const renderNodes = tool.nodes.filter(isRenderNode);

  return (
    <div className="mt-10 font-display">
      <div className="mb-4 flex items-center gap-2 border-b border-border/50 pb-3 text-sm font-semibold text-foreground">
        Preview
      </div>
      {running && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 size={13} className="animate-spin" />
          Running chain…
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
              <div>Add an input node to render a preview.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {renderNodes.map((node) => {
                if (node.type === "canvas") {
                  return (
                    <div
                      key={node.id}
                      className="rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm backdrop-blur-sm [&_h4]:mb-1 [&_h4]:font-semibold [&_p]:text-sm [&_p]:text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: node.html }}
                    />
                  );
                }

                const name = resolveBinding(node.binding, stateNode);

                if (node.type === "textarea") {
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
                      <textarea
                        rows={4}
                        placeholder={node.placeholder}
                        value={runtime[name] ?? ""}
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
                    </div>
                  );
                }

                // text_run
                const value = inputs[node.id] ?? "";
                const submit = () => {
                  trigger(name, value);
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
