"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  Link2,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiKeysButton } from "@/features/AiKeysButton";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Tool } from "@/types/tool-builder";

function SortableToolItem({
  t,
  selected,
  renaming,
  selectTool,
  beginRename,
  shareTool,
  previewTool,
  deleteTool,
  draftName,
  setDraftName,
  commitRename,
  setRenamingId,
  inputRef,
}: {
  t: Tool;
  selected: boolean;
  renaming: boolean;
  selectTool: (id: string) => void;
  beginRename: (id: string, name: string) => void;
  shareTool: (id: string) => void;
  previewTool: (id: string) => void;
  deleteTool: (id: string) => void;
  draftName: string;
  setDraftName: (val: string) => void;
  commitRename: () => void;
  setRenamingId: (id: string | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t: translate } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: t.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !renaming && selectTool(t.id)}
      onDoubleClick={() => !renaming && beginRename(t.id, t.name)}
      onKeyDown={(e) => {
        if (renaming) {
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectTool(t.id);
        }
      }}
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 border-2 px-2.5 py-2 transition-colors duration-(--motion-duration-fast)",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected
          ? "border-foreground bg-primary text-primary-foreground shadow-nb-sm"
          : "border-transparent hover:border-foreground hover:bg-accent",
      )}
      {...attributes}
      {...listeners}
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
          className="flex-1 border-2 border-foreground bg-background px-1.5 py-0.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      ) : (
        <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={translate("tools.options")}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "grid size-7 place-items-center rounded-md text-muted-foreground transition-[opacity,background-color] duration-[var(--motion-duration-fast)] hover:bg-background active:scale-95",
              "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
            )}
          >
            <MoreHorizontal size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => previewTool(t.id)}>
            <Eye />
            {translate("tools.preview")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => beginRename(t.id, t.name)}>
            <Pencil />
            {translate("tools.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => shareTool(t.id)}>
            <Link2 />
            {translate("tools.share")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => deleteTool(t.id)}
          >
            <Trash2 />
            {translate("tools.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Left panel — the tools list with search, a per-row options menu, and a
 * create control. Selecting a row opens that tool in the builder; the options
 * menu exposes rename (inline edit) and delete (with confirmation dialog).
 */
export function ToolsPanel({ onHide }: { onHide: () => void }) {
  const {
    tools,
    filteredTools,
    selectedToolId,
    search,
    setSearch,
    selectTool,
    addTool,
    renameTool,
    deleteTool,
    reorderTools,
  } = useToolBuilder();
  const { t } = useTranslation();

  /** Id of the tool currently being renamed inline, or null. */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** Id of the tool pending delete confirmation, or null. */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const toolToDelete = tools.find((t) => t.id === deleteConfirmId) ?? null;

  function confirmDelete() {
    if (deleteConfirmId) {
      deleteTool(deleteConfirmId);
    }
    setDeleteConfirmId(null);
  }

  useEffect(() => {
    if (renamingId) {
      inputRef.current?.select();
    }
  }, [renamingId]);

  function beginRename(id: string, current: string) {
    setRenamingId(id);
    setDraftName(current);
  }

  function commitRename() {
    if (renamingId) {
      const name = draftName.trim();
      if (name) {
        renameTool(renamingId, name);
      }
    }
    setRenamingId(null);
  }

  async function handleShare(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("tools")
      .update({ is_shared: true })
      .eq("id", id);
    if (error) {
      toast.error(t("tools.shareError"));
      return;
    }
    const url = `${window.location.origin}/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("tools.shareCopied"));
  }

  /**
   * Open the tool's public share page in a new tab. Opens the tab
   * synchronously (so the popup blocker treats it as a user gesture), enables
   * sharing — the public page 404s on unshared tools — then redirects the tab.
   */
  async function handlePreview(id: string) {
    const tab = window.open("about:blank", "_blank");
    const supabase = createClient();
    const { error } = await supabase
      .from("tools")
      .update({ is_shared: true })
      .eq("id", id);
    if (error) {
      toast.error(t("tools.previewError"));
      tab?.close();
      return;
    }
    const url = `${window.location.origin}/${id}`;
    if (tab) {
      tab.location.href = url;
    } else {
      toast.error(t("tools.popupBlocked"));
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTools(active.id as string, over.id as string);
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-foreground px-4">
        <span className="text-sm font-bold">{t("tools.title")}</span>
        <div className="ml-auto flex items-center gap-2">
          <AiKeysButton />
          <button
            type="button"
            aria-label={t("tools.new")}
            onClick={addTool}
            className="nb-press grid size-8 place-items-center border-2 border-foreground bg-card shadow-nb-sm"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            aria-label={t("builder.toggleTools")}
            onClick={onHide}
            className="nb-press grid size-8 place-items-center border-2 border-foreground bg-card text-muted-foreground shadow-nb-sm hover:text-foreground"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>

      <div className="border-b-2 border-foreground px-3 py-2.5">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tools.search")}
            className="h-8 w-full border-2 border-foreground bg-background pl-8 pr-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {filteredTools.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-2 text-center text-muted-foreground">
            <span className="grid size-12 place-items-center border-2 border-foreground bg-card shadow-nb">
              {search ? (
                <SearchX className="size-6" aria-hidden />
              ) : (
                <Wrench className="size-6" aria-hidden />
              )}
            </span>
            <p className="max-w-[16rem] text-xs">
              {search ? t("tools.noMatch", { q: search }) : t("tools.empty")}
            </p>
          </div>
        ) : (
          <DndContext
            id="tools-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredTools.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1">
                {filteredTools.map((t) => (
                  <SortableToolItem
                    key={t.id}
                    t={t}
                    selected={t.id === selectedToolId}
                    renaming={t.id === renamingId}
                    selectTool={selectTool}
                    beginRename={beginRename}
                    shareTool={handleShare}
                    previewTool={handlePreview}
                    deleteTool={setDeleteConfirmId}
                    draftName={draftName}
                    setDraftName={setDraftName}
                    commitRename={commitRename}
                    setRenamingId={setRenamingId}
                    inputRef={inputRef}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="border-t-2 border-foreground p-3">
        <button
          type="button"
          onClick={addTool}
          className="nb-press inline-flex w-full items-center justify-center gap-1.5 border-2 border-foreground bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-nb"
        >
          <Plus size={14} /> {t("tools.new")}
        </button>
      </div>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("tools.deleteTitle")}</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {toolToDelete?.name}
              </span>{" "}
              {t("tools.deleteBodyTail")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
