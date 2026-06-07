"use client";

import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { cn } from "@/lib/utils";

/**
 * Left panel — the tools list with search, a per-row options menu, and a
 * create control. Selecting a row opens that tool in the builder; the options
 * menu exposes rename (inline edit) and delete.
 */
export function ToolsPanel() {
  const {
    filteredTools,
    selectedToolId,
    search,
    setSearch,
    selectTool,
    addTool,
    renameTool,
    deleteTool,
  } = useToolBuilder();

  /** Id of the tool currently being renamed inline, or null. */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) {inputRef.current?.select();}
  }, [renamingId]);

  function beginRename(id: string, current: string) {
    setRenamingId(id);
    setDraftName(current);
  }

  function commitRename() {
    if (renamingId) {
      const name = draftName.trim();
      if (name) {renameTool(renamingId, name);}
    }
    setRenamingId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-semibold">Tools</span>
        <button
          type="button"
          aria-label="New tool"
          onClick={addTool}
          className="ml-auto grid size-8 place-items-center rounded-md border transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-95"
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="border-b px-3 py-2.5">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools…"
            className="h-8 w-full rounded-md border bg-background pl-8 pr-2.5 text-sm outline-none transition-[box-shadow,border-color] duration-[var(--motion-duration-fast)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {filteredTools.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No tools match “{search}”.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredTools.map((t) => {
              const selected = t.id === selectedToolId;
              const renaming = t.id === renamingId;
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !renaming && selectTool(t.id)}
                  onDoubleClick={() => !renaming && beginRename(t.id, t.name)}
                  onKeyDown={(e) => {
                    if (renaming) {return;}
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectTool(t.id);
                    }
                  }}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors duration-[var(--motion-duration-fast)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    selected ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      selected ? "bg-foreground" : "bg-muted-foreground/40",
                    )}
                  />
                  {renaming ? (
                    <input
                      ref={inputRef}
                      value={draftName}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setRenamingId(null);
                        }
                      }}
                      className="flex-1 rounded-sm border bg-background px-1.5 py-0.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm font-medium">
                      {t.name}
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Tool options"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "grid size-7 place-items-center rounded-md text-muted-foreground transition-[opacity,background-color] duration-[var(--motion-duration-fast)] hover:bg-background active:scale-95",
                          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                        )}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onSelect={() => beginRename(t.id, t.name)}
                      >
                        <Pencil />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => deleteTool(t.id)}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <button
          type="button"
          onClick={addTool}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-[0.99]"
        >
          <Plus size={14} /> New tool
        </button>
      </div>
    </div>
  );
}
