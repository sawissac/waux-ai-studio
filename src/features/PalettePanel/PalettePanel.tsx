"use client";

import { Plus, Search, SearchX, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ACCENT_CLASSES,
  NODE_META,
  PALETTE_GROUPS,
} from "@/constants/tool-builder";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

/** dataTransfer MIME used to carry a node type from palette to builder. */
export const NODE_DND_MIME = "application/x-tool-node-type";

/**
 * "Node" — the catalogue of node types, grouped. Clicking a
 * card appends that node to the open tool and selects it; each card is
 * also draggable into the Builder drop zone (see {@link NODE_DND_MIME}).
 */
export function PalettePanel() {
  const { addNode } = useToolBuilder();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) {
      return PALETTE_GROUPS;
    }
    return PALETTE_GROUPS.map(({ group, types }) => ({
      group,
      types: types.filter((type) => {
        const label = t(`node.${type}.label`).toLowerCase();
        const blurb = NODE_META[type].blurb
          ? t(`node.${type}.blurb`).toLowerCase()
          : "";
        return label.includes(q) || blurb.includes(q);
      }),
    })).filter(({ types }) => types.length > 0);
  }, [q, t]);

  const hasResults = filteredGroups.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
        <span className="text-sm font-bold">{t("palette.title")}</span>
      </div>
      <div className="border-b-2 border-foreground px-3 py-2.5">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("palette.search")}
            className="h-8 w-full border-2 border-foreground bg-background pl-8 pr-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 @container">
        <div className="flex flex-col gap-4">
          {filteredGroups.map(({ group, types }) => (
            <div key={group} className="flex flex-col gap-1.5">
              <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {t(`palette.group.${group}`)}
              </div>
              <div className="grid grid-cols-1 gap-1.5 @xl:grid-cols-2 @4xl:grid-cols-3">
                {types.map((type) => {
                  const meta = NODE_META[type];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(NODE_DND_MIME, type);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => addNode(type)}
                      className="nb-press group flex cursor-grab items-start gap-3 border-2 border-foreground bg-card p-2.5 text-left shadow-nb-sm active:cursor-grabbing"
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center border-2 border-foreground",
                          ACCENT_CLASSES[meta.accent],
                        )}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {t(`node.${type}.label`)}
                        </span>
                        {meta.blurb && (
                          <span className="block text-[11px] leading-snug text-muted-foreground">
                            {t(`node.${type}.blurb`)}
                          </span>
                        )}
                      </span>
                      <span className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-(--motion-duration-fast) group-hover:bg-foreground group-hover:text-background">
                        <Plus size={15} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {!hasResults && (
          <div className="flex flex-col items-center justify-center gap-3 px-2 py-10 text-center text-muted-foreground">
            <span className="grid size-12 place-items-center border-2 border-foreground bg-card shadow-nb">
              <SearchX className="size-6" aria-hidden />
            </span>
            <p className="max-w-[16rem] text-xs">{t("palette.empty")}</p>
          </div>
        )}
        {hasResults && (
          <div className="mt-4 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            <Sparkles size={13} /> {t("palette.footer")}
          </div>
        )}
      </div>
    </div>
  );
}
