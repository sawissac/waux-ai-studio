"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export interface ModelComboboxProps {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  placeholder?: string;
  size?: "sm" | "default";
  className?: string;
  popoverClassName?: string;
}

/**
 * Searchable model picker built on shadcn Popover + Command. Accepts any
 * free-form id alongside the suggestion list — when the typed query doesn't
 * match an option, a "Use '{query}'" entry commits the custom value.
 */
export function ModelCombobox({
  value,
  onChange,
  options,
  placeholder = "Pick a model…",
  size = "default",
  className,
  popoverClassName,
}: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const hasExact = options.some((o) => o === trimmed);

  const commit = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            size === "sm" && "h-8 px-2 text-xs",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[--radix-popover-trigger-width] p-0",
          popoverClassName,
        )}
      >
        <Command shouldFilter>
          <CommandInput
            placeholder="Search or type any model id…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && !hasExact) {
                e.preventDefault();
                commit(trimmed);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed ? (
                <button
                  type="button"
                  onClick={() => commit(trimmed)}
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  Use <span className="font-mono">&ldquo;{trimmed}&rdquo;</span>
                </button>
              ) : (
                "No models."
              )}
            </CommandEmpty>
            {trimmed && !hasExact && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={`__custom__${trimmed}`}
                  onSelect={() => commit(trimmed)}
                >
                  Use <span className="ml-1 font-mono">{trimmed}</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Available">
              {options.map((o) => (
                <CommandItem
                  key={o}
                  value={o}
                  onSelect={() => commit(o)}
                  className="font-mono text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5",
                      value === o ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
