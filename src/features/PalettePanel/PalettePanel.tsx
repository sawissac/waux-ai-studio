"use client";

import { Plus, Sparkles } from "lucide-react";

import {
  ACCENT_CLASSES,
  NODE_META,
  PALETTE_GROUPS,
} from "@/constants/tool-builder";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { cn } from "@/lib/utils";

/**
 * "Select Inputs" palette — the catalogue of node types, grouped. Clicking a
 * card appends that node to the open tool and selects it.
 */
export function PalettePanel() {
  const { addNode } = useToolBuilder();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-semibold">Select Inputs</span>
        <span className="ml-auto rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          click to add
        </span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="flex flex-col gap-4">
          {PALETTE_GROUPS.map(({ group, types }) => (
            <div key={group} className="flex flex-col gap-1.5">
              <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {group}
              </div>
              {types.map((type) => {
                const meta = NODE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addNode(type)}
                    className="group flex items-start gap-3 rounded-xl border bg-card p-2.5 text-left transition-[border-color,background-color,transform] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] hover:border-foreground/20 hover:bg-accent/40 active:scale-[0.99]"
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        ACCENT_CLASSES[meta.accent],
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {meta.label}
                      </span>
                      {meta.blurb && (
                        <span className="block text-[11px] leading-snug text-muted-foreground">
                          {meta.blurb}
                        </span>
                      )}
                    </span>
                    <span className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] group-hover:bg-foreground group-hover:text-background">
                      <Plus size={15} />
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <Sparkles size={13} /> Nodes run top-to-bottom along the chain.
        </div>
      </div>
    </div>
  );
}
