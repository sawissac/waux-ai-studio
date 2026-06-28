"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ACCENT_CLASSES,
  NODE_META,
  PALETTE_GROUPS,
} from "@/constants/tool-builder";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { ToolNodeType } from "@/types/tool-builder";

/**
 * Where (and how) a {@link NodeInserter} renders:
 *
 * - `gap` — a hover-revealed `+` overlaid on the connector between two nodes.
 * - `end` — the full-width dashed "Add node" button below the chain.
 * - `empty` — the primary "Add first node" button shown for an empty tool.
 */
type InserterVariant = "gap" | "end" | "empty";

/**
 * Inline node inserter — opens a searchable quick-add picker and drops the
 * chosen node into the open tool **at `index`** (via
 * {@link useToolBuilder.insertNode}), then selects it.
 *
 * This is the restructured build interaction: instead of routing to the right
 * palette and dragging the new node up the chain, every gap (and the chain end)
 * carries its own inserter, so authors place nodes exactly where they belong in
 * one click. Requesting a second State Control just re-selects the existing one
 * (the slice keeps a tool's State Control single).
 *
 * @param props.index - Chain position the picked node is inserted at.
 * @param props.variant - Trigger presentation (see {@link InserterVariant}).
 * @param props.dropActive - When `end`, mirror the canvas drag-over highlight so
 *   the affordance reads as a live drop target too.
 */
export function NodeInserter({
  index,
  variant,
  dropActive = false,
}: {
  index: number;
  variant: InserterVariant;
  dropActive?: boolean;
}) {
  const { insertNode } = useToolBuilder();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const pick = (type: ToolNodeType) => {
    insertNode(type, index);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {variant === "gap" ? (
        // A 24px-tall hover band over the connector. The line stays visible; the
        // `+` (the trigger itself) fades in on hover / focus / while open.
        <div className="group/ins relative mx-auto flex h-6 w-full items-center justify-center">
          <span
            className="pointer-events-none absolute h-full w-0 border-l-2 border-foreground"
            aria-hidden
          />
          <PopoverTrigger
            aria-label={t("builder.insertHere")}
            className="relative z-10 grid size-5 place-items-center rounded-full border-2 border-foreground bg-background text-muted-foreground opacity-0 shadow-nb-sm transition-[opacity,transform,background-color] duration-(--motion-duration-fast) hover:bg-primary hover:text-primary-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 group-hover/ins:opacity-100 data-[state=open]:bg-primary data-[state=open]:text-primary-foreground data-[state=open]:opacity-100"
          >
            <Plus size={12} />
          </PopoverTrigger>
        </div>
      ) : variant === "empty" ? (
        <PopoverTrigger className="nb-press inline-flex items-center gap-1.5 border-2 border-foreground bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-nb-sm">
          <Plus size={15} /> {t("builder.emptyAdd")}
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          className={cn(
            "inline-flex h-14 w-full items-center justify-center gap-1.5 border-2 border-dashed border-foreground text-sm font-bold text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
            dropActive && "border-primary bg-accent text-foreground",
          )}
        >
          <Plus size={15} /> {t("builder.addNode")}
        </PopoverTrigger>
      )}

      <PopoverContent
        align={variant === "gap" ? "center" : "start"}
        sideOffset={6}
        className="w-72 p-0"
        // Keep the canvas keyboard handler from also seeing the picker's keys.
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Command
          // Match label + blurb + type so search works in either language.
          filter={(value, query) =>
            value.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={t("quickAdd.search")} autoFocus />
          <CommandList>
            <CommandEmpty>{t("quickAdd.empty")}</CommandEmpty>
            {PALETTE_GROUPS.map(({ group, types }) => (
              <CommandGroup key={group} heading={t(`palette.group.${group}`)}>
                {types.map((type) => {
                  const meta = NODE_META[type];
                  const Icon = meta.icon;
                  const label = t(`node.${type}.label`);
                  const blurb = meta.blurb ? t(`node.${type}.blurb`) : "";
                  return (
                    <CommandItem
                      key={type}
                      value={`${label} ${blurb} ${type}`}
                      onSelect={() => pick(type)}
                      className="gap-2.5"
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center border-2 border-foreground",
                          ACCENT_CLASSES[meta.accent],
                        )}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {label}
                        </span>
                        {blurb && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {blurb}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
