"use client";

import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

import {
  initialStateMap,
  resolveBinding,
  runChain,
  type StateMap,
} from "@/lib/tool-builder-runtime";
import { cn } from "@/lib/utils";
import type { StateNode, Tool } from "@/types/tool-builder";
import { isRenderNode } from "@/types/tool-builder";

const fieldInput =
  "h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none transition-[box-shadow,border-color] duration-[var(--motion-duration-fast)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
const btnBase =
  "h-9 shrink-0 rounded-md px-3.5 text-sm font-medium transition-[transform,background-color] duration-[var(--motion-duration-instant)] active:scale-[0.97]";

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

  // Full reset when switching tools.
  useEffect(() => {
    setRuntime(initialStateMap(stateNode));
    setInputs({});
  }, [tool.id]);

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

  /** Write `value` to `name`, then run the code chain. */
  const trigger = (name: string, value: string) =>
    setRuntime((prev) => runChain(tool, { ...prev, [name]: value }));

  const setInput = (id: string, v: string) =>
    setInputs((prev) => ({ ...prev, [id]: v }));

  const renderNodes = tool.nodes.filter(isRenderNode);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Eye size={13} /> Preview
        <span className="text-[11px] font-normal text-muted-foreground/70">
          live — what the end user sees
        </span>
      </div>
      <div className="rounded-xl border bg-muted/30 p-4">
        {renderNodes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Eye size={20} />
            <div>Add an input node to render a preview.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {renderNodes.map((node) => {
              if (node.type === "canvas") {
                return (
                  <div
                    key={node.id}
                    className="rounded-lg border bg-background p-3 [&_h4]:mb-1 [&_h4]:font-semibold [&_p]:text-sm [&_p]:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: node.html }}
                  />
                );
              }

              const name = resolveBinding(node.binding, stateNode);

              if (node.type === "textarea") {
                return (
                  <div key={node.id} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">
                      {node.fieldLabel}
                    </label>
                    <textarea
                      rows={4}
                      placeholder={node.placeholder}
                      value={runtime[name] ?? ""}
                      onChange={(e) =>
                        setRuntime((prev) => ({
                          ...prev,
                          [name]: e.target.value,
                        }))
                      }
                      className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none transition-[box-shadow,border-color] duration-[var(--motion-duration-fast)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  </div>
                );
              }

              // text_run_reset | text_run
              const value = inputs[node.id] ?? "";
              const submit = () => {
                trigger(name, value);
                if (node.type === "text_run_reset") {
                  setInput(node.id, "");
                }
              };

              return (
                <div key={node.id} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">
                    {node.fieldLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={value}
                      placeholder={node.placeholder}
                      onChange={(e) => setInput(node.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          submit();
                        }
                      }}
                      className={fieldInput}
                    />
                    <button
                      type="button"
                      onClick={submit}
                      className={cn(
                        btnBase,
                        "bg-foreground text-background hover:bg-foreground/90",
                      )}
                    >
                      {node.buttonText}
                    </button>
                    {node.type === "text_run_reset" && (
                      <button
                        type="button"
                        onClick={() => setInput(node.id, "")}
                        className={cn(btnBase, "border hover:bg-accent")}
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
  );
}
