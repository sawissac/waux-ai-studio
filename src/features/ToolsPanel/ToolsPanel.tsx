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
  Copy,
  Eye,
  Globe,
  LayoutGrid,
  Link2,
  Loader2,
  Lock,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  SearchX,
  Shapes,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ToolIcon } from "@/components/customs/ToolIcon";
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
import { useChatModelPref } from "@/hooks/useChatModelPref";
import { useGallery } from "@/hooks/useGallery";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import { generateToolIcon } from "@/lib/generate-tool-icon";
import { generateToolName } from "@/lib/generate-tool-name";
import { sanitizeSvgIcon } from "@/lib/html-sanitize";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Tool } from "@/types/tool-builder";

function SortableToolItem({
  t,
  selected,
  renaming,
  generating,
  inGallery,
  isShared,
  selectTool,
  beginRename,
  generateName,
  editIcon,
  shareTool,
  previewTool,
  toggleGallery,
  toggleShared,
  duplicateTool,
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
  generating: boolean;
  inGallery: boolean;
  isShared: boolean;
  selectTool: (id: string) => void;
  beginRename: (id: string, name: string) => void;
  generateName: (id: string) => void;
  editIcon: (id: string) => void;
  shareTool: (id: string) => void;
  previewTool: (id: string) => void;
  toggleGallery: (id: string) => void;
  toggleShared: (id: string) => void;
  duplicateTool: (id: string) => void;
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
      <ToolIcon
        svg={t.icon}
        className={cn(
          "size-5 shrink-0 transition-colors duration-(--motion-duration-fast)",
          selected ? "text-primary-foreground" : "text-muted-foreground",
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
              "grid size-7 place-items-center rounded-md text-muted-foreground transition-[opacity,background-color] duration-(--motion-duration-fast) hover:bg-background active:scale-95",
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
          <DropdownMenuItem onSelect={() => editIcon(t.id)}>
            <Shapes />
            {translate("tools.editIcon")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={generating}
            onSelect={(e) => {
              // Keep the menu's focus handling happy while the async name
              // request runs; the row shows a spinner via `generating`.
              e.preventDefault();
              generateName(t.id);
            }}
          >
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {translate("tools.generateName")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => shareTool(t.id)}>
            <Link2 />
            {translate("tools.share")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toggleGallery(t.id)}>
            <LayoutGrid />
            {inGallery
              ? translate("gallery.removeFromGallery")
              : translate("gallery.addToGallery")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toggleShared(t.id)}>
            {isShared ? <Lock /> : <Globe />}
            {isShared
              ? translate("gallery.makePrivate")
              : translate("gallery.makePublic")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateTool(t.id)}>
            <Copy />
            {translate("tools.duplicate")}
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
    setToolIcon,
    deleteTool,
    duplicateTool,
    reorderTools,
  } = useToolBuilder();
  const { t } = useTranslation();
  const { provider, model } = useChatModelPref();
  const { flagsById, setToolInGallery, setToolShared } = useGallery();

  /** Id of the tool currently being renamed inline, or null. */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** Id of the tool whose name is being generated by AI, or null. */
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  /** Id of the tool whose icon is being edited in the dialog, or null. */
  const [iconEditId, setIconEditId] = useState<string | null>(null);
  /** Draft SVG markup shown in the icon editor (live-previewed). */
  const [draftIcon, setDraftIcon] = useState("");
  /** Whether an AI icon generation is in flight. */
  const [iconGenerating, setIconGenerating] = useState(false);
  const toolToEditIcon = tools.find((t) => t.id === iconEditId) ?? null;

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

  /**
   * Generate a name for a tool from its node chain using the user's global
   * Builder-chat model, then rename the tool to the result. Surfaces progress
   * and failures (empty tool, missing key, provider error) via toasts.
   */
  async function handleGenerateName(id: string) {
    const tool = tools.find((tl) => tl.id === id);
    if (!tool) {
      return;
    }
    if ((tool.nodes ?? []).length === 0) {
      toast.error(t("tools.generateEmpty"));
      return;
    }
    setGeneratingId(id);
    const toastId = toast.loading(t("tools.generating"));
    try {
      const name = await generateToolName({ tool, provider, model });
      renameTool(id, name);
      toast.success(t("tools.generateSuccess", { name }), { id: toastId });
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "EMPTY_TOOL"
          ? t("tools.generateEmpty")
          : t("tools.generateError");
      toast.error(msg, { id: toastId });
    } finally {
      setGeneratingId(null);
    }
  }

  /** Open the icon editor for a tool, seeding the draft with its current SVG. */
  function beginEditIcon(id: string) {
    const tool = tools.find((tl) => tl.id === id);
    setDraftIcon(tool?.icon ?? "");
    setIconEditId(id);
  }

  /**
   * Persist the draft SVG (sanitised) as the open tool's icon. A blank draft
   * clears the icon; a non-blank draft that sanitises to nothing is rejected
   * with a toast so the user can fix it rather than silently losing the icon.
   */
  function commitIcon() {
    if (!iconEditId) {
      return;
    }
    const trimmed = draftIcon.trim();
    if (!trimmed) {
      setToolIcon(iconEditId, "");
      setIconEditId(null);
      return;
    }
    const clean = sanitizeSvgIcon(trimmed);
    if (!clean) {
      toast.error(t("tools.iconInvalid"));
      return;
    }
    setToolIcon(iconEditId, clean);
    toast.success(t("tools.iconSaved"));
    setIconEditId(null);
  }

  /**
   * Generate an SVG icon for the tool being edited from its node chain, using
   * the user's global Builder-chat model, and drop the result into the draft
   * for review before saving. Surfaces progress + failures via toasts.
   */
  async function handleGenerateIcon() {
    const tool = toolToEditIcon;
    if (!tool) {
      return;
    }
    if ((tool.nodes ?? []).length === 0) {
      toast.error(t("tools.generateEmpty"));
      return;
    }
    setIconGenerating(true);
    const toastId = toast.loading(t("tools.iconGenerating"));
    try {
      const svg = await generateToolIcon({ tool, provider, model });
      setDraftIcon(svg);
      toast.success(t("tools.iconGenerateSuccess"), { id: toastId });
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "EMPTY_TOOL"
          ? t("tools.generateEmpty")
          : t("tools.iconGenerateError");
      toast.error(msg, { id: toastId });
    } finally {
      setIconGenerating(false);
    }
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

  /** Add the tool to / remove it from the owner's gallery. */
  async function handleToggleGallery(id: string) {
    const next = !(flagsById.get(id)?.inGallery ?? false);
    try {
      await setToolInGallery(id, next);
      toast.success(next ? t("gallery.added") : t("gallery.removed"));
    } catch {
      toast.error(t("gallery.flagError"));
    }
  }

  /** Toggle the tool's public visibility (its share flag). */
  async function handleTogglePublic(id: string) {
    const next = !(flagsById.get(id)?.isShared ?? false);
    try {
      await setToolShared(id, next);
      toast.success(next ? t("gallery.madePublic") : t("gallery.madePrivate"));
    } catch {
      toast.error(t("gallery.flagError"));
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
                    generating={t.id === generatingId}
                    inGallery={flagsById.get(t.id)?.inGallery ?? false}
                    isShared={flagsById.get(t.id)?.isShared ?? false}
                    selectTool={selectTool}
                    beginRename={beginRename}
                    generateName={handleGenerateName}
                    editIcon={beginEditIcon}
                    shareTool={handleShare}
                    previewTool={handlePreview}
                    toggleGallery={handleToggleGallery}
                    toggleShared={handleTogglePublic}
                    duplicateTool={duplicateTool}
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

      <Dialog
        open={iconEditId !== null}
        onOpenChange={(open) => !open && setIconEditId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tools.iconTitle")}</DialogTitle>
            <DialogDescription>{t("tools.iconDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center border-2 border-foreground bg-card text-foreground shadow-nb-sm">
              {draftIcon.trim() ? (
                <ToolIcon svg={draftIcon} className="size-10" />
              ) : (
                <span className="px-1 text-center text-[0.625rem] leading-tight text-muted-foreground">
                  {t("tools.iconEmptyPreview")}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateIcon}
                disabled={iconGenerating}
              >
                {iconGenerating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                {t("tools.iconGenerate")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraftIcon("")}
                disabled={!draftIcon.trim() || iconGenerating}
              >
                {t("tools.iconClear")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tool-icon-svg"
              className="text-xs font-medium text-muted-foreground"
            >
              {t("tools.iconCode")}
            </label>
            <textarea
              id="tool-icon-svg"
              value={draftIcon}
              onChange={(e) => setDraftIcon(e.target.value)}
              placeholder={t("tools.iconPlaceholder")}
              spellCheck={false}
              rows={6}
              className="w-full resize-y border-2 border-foreground bg-background p-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIconEditId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={commitIcon} disabled={iconGenerating}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
