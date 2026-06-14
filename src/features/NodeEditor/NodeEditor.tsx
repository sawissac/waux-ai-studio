"use client";

import {
  ChevronDown,
  ChevronLeft,
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModelCombobox } from "@/components/ui/model-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MessageKey } from "@/constants/i18n";
import {
  ACCENT_CLASSES,
  CODE_INPUT_LANGUAGES,
  DATE_MODES,
  EDITOR_HEIGHTS,
  ENCODE_OPERATIONS,
  FILE_OUTPUT_FORMATS,
  FILTER_OPERATORS,
  HTTP_METHODS,
  HTTP_RESPONSE_TYPES,
  JOIN_KINDS,
  NODE_META,
  REGEX_MODES,
  SCHEMA_TYPES,
  SORT_DIRECTIONS,
  SORT_TYPES,
  TABLE_PAGE_SIZES,
  uuid,
  VALUELESS_FILTER_OPERATORS,
  VIEWPORT_DEVICES,
} from "@/constants/tool-builder";
import { useProviderModels } from "@/hooks/useProviderModels";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type {
  AiNode,
  ButtonNode,
  CodeInputLanguage,
  CodeInputNode,
  ConvertHtmlNode,
  CsvNode,
  DateNode,
  DateTimeMode,
  EditorPlacement,
  EncodeNode,
  EncodeOperation,
  FileNode,
  FileOutputFormat,
  FilterNode,
  FilterOperator,
  HtmlSanitizeNode,
  HttpMethod,
  HttpRequestNode,
  HttpResponseType,
  ImageNode,
  JoinKind,
  JsonNode,
  JsonPathNode,
  MapNode,
  MarkdownNode,
  MathNode,
  MergeNode,
  NumberNode,
  RegexMode,
  RegexNode,
  SchemaRule,
  SchemaValidateNode,
  SelectNode,
  SelectOption,
  SortDirection,
  SortNode,
  SortType,
  StateEntry,
  StateNode,
  TableNode,
  TablePageSize,
  TemplateNode,
  TextareaNode,
  TextRunNode,
  ThemedNode,
  ToggleNode,
  ToolNode,
  ToolNodeType,
  TsTypeNode,
  ViewportDevice,
  ViewportNode,
} from "@/types/tool-builder";

const inputCls =
  "h-8 w-full rounded-md border bg-background px-2.5 text-sm outline-none transition-[box-shadow,border-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

const labelCls = "text-[11px] font-medium text-muted-foreground";

/** Inline switch row: label + description on the left, toggle on the right. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 px-2.5 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[11px] text-muted-foreground">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          checked ? "bg-primary border-primary" : "bg-muted border-border",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 transform rounded-full bg-background shadow-sm transition-transform duration-[var(--motion-duration-fast)]",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/** A labelled vertical field group. */
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

/** State-slot selector. Reusable across input + AI nodes. */
function StateSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { stateNode } = useToolBuilder();
  const { t } = useTranslation();
  const states = stateNode?.states ?? [];
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={states.length === 0}
    >
      <SelectTrigger className="h-8 w-full">
        <SelectValue
          placeholder={
            states.length === 0 ? t("field.noState") : t("field.pickState")
          }
        />
      </SelectTrigger>
      <SelectContent>
        {states.map((s) => (
          <SelectItem key={s.id} value={s.name}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Target selector shared by all input editors. */
function BindingControl({
  node,
}: {
  node:
    | TextRunNode
    | NumberNode
    | SelectNode
    | ToggleNode
    | DateNode
    | FileNode
    | ImageNode
    | TextareaNode
    | MarkdownNode
    | JsonNode
    | CsvNode
    | TableNode
    | CodeInputNode;
}) {
  const { stateNode, updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const states = stateNode?.states ?? [];
  const { value } = node.binding;

  return (
    <Field label={t("field.stateBinding")}>
      <Select
        value={value || undefined}
        onValueChange={(v) =>
          updateNode(node.id, { binding: { mode: "name", value: v } })
        }
        disabled={states.length === 0}
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue
            placeholder={
              states.length === 0 ? t("field.noState") : t("field.pickState")
            }
          />
        </SelectTrigger>
        <SelectContent>
          {states.map((s) => (
            <SelectItem key={s.id} value={s.name}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        {t("field.stateBinding.help")}
      </p>
    </Field>
  );
}

/**
 * Preview-editor height control shared by the sizeable input nodes
 * (textarea / markdown / json). Free typing while focused; clamps to the
 * {@link EDITOR_HEIGHTS} range on blur.
 */
function EditorHeightField({
  node,
}: {
  node:
    | TextareaNode
    | MarkdownNode
    | JsonNode
    | CodeInputNode
    | ViewportNode
    | ConvertHtmlNode
    | ThemedNode;
}) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const fallback = EDITOR_HEIGHTS.defaults[node.type];
  return (
    <Field label={t("field.editorHeight")}>
      <input
        type="number"
        min={EDITOR_HEIGHTS.min}
        max={EDITOR_HEIGHTS.max}
        step={10}
        value={node.editorHeight ?? fallback}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            updateNode(node.id, { editorHeight: n });
          }
        }}
        onBlur={(e) => {
          const n = Number(e.target.value);
          const clamped = Math.min(
            EDITOR_HEIGHTS.max,
            Math.max(EDITOR_HEIGHTS.min, Number.isFinite(n) ? n : fallback),
          );
          if (clamped !== node.editorHeight) {
            updateNode(node.id, { editorHeight: clamped });
          }
        }}
        className={inputCls}
      />
      <p className="text-[11px] text-muted-foreground">
        {t("field.editorHeight.help", {
          min: EDITOR_HEIGHTS.min,
          max: EDITOR_HEIGHTS.max,
        })}
      </p>
    </Field>
  );
}

/**
 * Run-target picker for a Button node. Lists the tool's code & AI nodes; the
 * button runs only the checked ones (in chain order). None checked = run all.
 */
function describeRunnable(n: ToolNode, t: (key: MessageKey) => string): string {
  if (n.type === "code") {
    return n.description?.trim() || t("node.code.label");
  }
  if (n.type === "ai") {
    return `${t("node.ai.label")} · ${n.model || "default"}`;
  }
  if (
    "description" in n &&
    typeof n.description === "string" &&
    n.description.trim()
  ) {
    return n.description.trim();
  }
  return t(`node.${n.type}.label`);
}

/**
 * Multi-select list of a button's targetable nodes. Generic over which
 * `ButtonNode` array field it edits (`targets` for run, `resetTargets` for
 * reset) and which node kinds are eligible (run targets code + AI; reset
 * targets code only, since `reset()` lives on code nodes).
 */
function TargetSelector({
  node,
  field,
  labelKey,
  kinds,
  emptyKey,
  helpAllKey,
  helpSomeKey,
}: {
  node: ButtonNode | TextRunNode;
  field: "targets" | "resetTargets";
  labelKey: MessageKey;
  kinds: ToolNodeType[];
  emptyKey: MessageKey;
  helpAllKey: MessageKey;
  helpSomeKey: MessageKey;
}) {
  const { tool, updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const eligible = (tool?.nodes ?? []).filter((n) => kinds.includes(n.type));
  const current = node[field] ?? [];
  const selected = new Set(current);

  const toggle = (id: string) => {
    const next = selected.has(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    updateNode(node.id, { [field]: next });
  };

  const triggerLabel =
    current.length === 0
      ? t("targets.all", { n: eligible.length })
      : t("targets.selected", { n: current.length });

  return (
    <Field label={t(labelKey)}>
      {eligible.length === 0 ? (
        <p className="rounded-md border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">
          {t(emptyKey)}
        </p>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 text-left text-xs font-medium transition-colors duration-(--motion-duration-fast) hover:bg-accent data-[state=open]:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
              <ChevronDown
                size={14}
                className="shrink-0 opacity-60 transition-transform duration-(--motion-duration-fast)"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-64 w-(--radix-dropdown-menu-trigger-width) min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto"
          >
            {eligible.map((n, i) => {
              const Icon = NODE_META[n.type].icon;
              return (
                <DropdownMenuCheckboxItem
                  key={n.id}
                  checked={selected.has(n.id)}
                  onSelect={() => toggle(n.id)}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center border-2 border-current",
                      ACCENT_CLASSES[NODE_META[n.type].accent],
                    )}
                  >
                    <Icon size={11} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {describeRunnable(n, t)}
                  </span>
                  <span className="shrink-0 font-mono opacity-60">
                    #{i + 1}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <p className="text-[11px] text-muted-foreground">
        {current.length === 0
          ? t(helpAllKey)
          : t(helpSomeKey, { n: current.length })}
      </p>
    </Field>
  );
}

function RunTargets({ node }: { node: ButtonNode | TextRunNode }) {
  return (
    <TargetSelector
      node={node}
      field="targets"
      labelKey="targets.run"
      kinds={[
        "code",
        "ts_type",
        "http_request",
        "filter",
        "map",
        "sort",
        "merge",
        "template",
        "regex",
        "jsonpath",
        "math",
        "schema_validate",
        "encode",
        "ai",
      ]}
      emptyKey="targets.run.empty"
      helpAllKey="targets.help.runAll"
      helpSomeKey="targets.help.runSome"
    />
  );
}

function ResetTargets({ node }: { node: ButtonNode | TextRunNode }) {
  return (
    <TargetSelector
      node={node}
      field="resetTargets"
      labelKey="targets.reset"
      kinds={["code"]}
      emptyKey="targets.reset.empty"
      helpAllKey="targets.help.resetAll"
      helpSomeKey="targets.help.resetSome"
    />
  );
}

/** State Control editor — manage the shared state slots. */
function StateEditor({ node }: { node: StateNode }) {
  const { updateNode, renameStateSlot } = useToolBuilder();
  const { t } = useTranslation();
  const setStates = (states: StateEntry[]) => updateNode(node.id, { states });

  const [showDefaultFor, setShowDefaultFor] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {node.states.map((s) => (
          <div key={s.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {/* variable name */}
              <div className="flex-1 truncate rounded-md border border-transparent px-2.5 py-1.5 font-mono text-sm">
                {s.name || (
                  <span className="text-muted-foreground italic">
                    {t("state.unnamed")}
                  </span>
                )}
              </div>
              {/* copy button */}
              <button
                type="button"
                aria-label={t("state.copyName")}
                onClick={() => navigator.clipboard.writeText(s.name)}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-95"
              >
                <Copy size={14} />
              </button>
              {/* options dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("state.options")}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-95"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setRenameTarget({ id: s.id, name: s.name });
                      setRenameValue(s.name);
                    }}
                  >
                    {t("state.rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      setShowDefaultFor(showDefaultFor === s.id ? null : s.id)
                    }
                  >
                    {t("state.setDefault")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      setStates(node.states.filter((x) => x.id !== s.id))
                    }
                  >
                    {t("state.remove")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* collapsible default value row */}
            {showDefaultFor === s.id && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-[var(--motion-duration-fast)]">
                <input
                  value={s.value}
                  placeholder={t("state.defaultPlaceholder")}
                  autoFocus
                  onChange={(e) =>
                    setStates(
                      node.states.map((x) =>
                        x.id === s.id ? { ...x, value: e.target.value } : x,
                      ),
                    )
                  }
                  className={inputCls}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const n = node.states.filter((s) => /^state\d+$/.test(s.name)).length;
          setStates([
            ...node.states,
            { id: uuid(), name: `state${n + 1}`, value: "" },
          ]);
        }}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-[0.98]"
      >
        <Plus size={14} /> {t("state.add")}
      </button>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("state.rename")}</DialogTitle>
          </DialogHeader>
          <input
            className={inputCls}
            value={renameValue}
            autoFocus
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = renameValue.trim();
                if (renameTarget && v && v !== renameTarget.name) {
                  renameStateSlot(renameTarget.id, renameTarget.name, v);
                }
                setRenameTarget(null);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                const v = renameValue.trim();
                if (renameTarget && v && v !== renameTarget.name) {
                  renameStateSlot(renameTarget.id, renameTarget.name, v);
                }
                setRenameTarget(null);
              }}
            >
              {t("common.rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** AI node editor — provider, model, prompt, output binding, key. */
function AiEditor({
  node,
  placement,
}: {
  node: AiNode;
  placement: EditorPlacement;
}) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const models = useProviderModels(node.provider);
  const isPanel = placement === "panel";
  return (
    <div className={cn("flex flex-col gap-4", isPanel && "flex-1 min-h-0")}>
      <Field label={t("ai.provider")}>
        <Select
          value={node.provider}
          onValueChange={(v) =>
            updateNode(node.id, { provider: v as AiNode["provider"] })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="openrouter">OpenRouter</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("ai.model")}>
        <ModelCombobox
          value={node.model}
          onChange={(v) => updateNode(node.id, { model: v })}
          options={models}
          placeholder={
            node.provider === "openrouter"
              ? "openrouter/auto"
              : "gemini-2.5-flash"
          }
          size="sm"
        />
        <p className="text-[11px] text-muted-foreground">
          {t("ai.model.help")}
        </p>
      </Field>
      <Field
        label={t("ai.prompt")}
        className={isPanel ? "flex-1 min-h-0" : undefined}
      >
        <textarea
          value={node.prompt}
          onChange={(e) => updateNode(node.id, { prompt: e.target.value })}
          rows={isPanel ? 8 : 5}
          className={cn(inputCls, "h-auto min-h-24 resize-y py-2 font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("ai.prompt.help")}
        </p>
      </Field>
      <Field label={t("ai.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("ai.output.help")}
        </p>
      </Field>
      <ToggleRow
        label={t("ai.markdownOut")}
        description={t("ai.markdownOut.desc")}
        checked={node.markdownOutput ?? false}
        onChange={(next) => updateNode(node.id, { markdownOutput: next })}
      />
    </div>
  );
}

/** TS Type Converter editor — description, root name, input/output bindings. */
function TsTypeEditor({ node }: { node: TsTypeNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <Field label={t("field.description")}>
        <input
          value={node.description ?? ""}
          placeholder={t("tstype.descPlaceholder")}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("tstype.root")}>
        <input
          value={node.rootName}
          placeholder="Root"
          onChange={(e) => updateNode(node.id, { rootName: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("tstype.root.help")}
        </p>
      </Field>
      <Field label={t("tstype.input")}>
        <StateSelect
          value={node.input.value}
          onChange={(v) =>
            updateNode(node.id, { input: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("tstype.input.help")}
        </p>
      </Field>
      <Field label={t("tstype.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("tstype.output.help")}
        </p>
      </Field>
    </div>
  );
}

/**
 * Live-preview on/off switch shared by the website nodes. Off by default — the
 * frame (and its network load) is skipped until the author turns it on.
 */
function PreviewToggleField({
  node,
}: {
  node: ViewportNode | ConvertHtmlNode | ThemedNode;
}) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <ToggleRow
      label={t("web.livePreview")}
      description={t("web.livePreview.desc")}
      checked={node.previewEnabled ?? false}
      onChange={(next) => updateNode(node.id, { previewEnabled: next })}
    />
  );
}

/** HTML Sanitize editor — description, input/output bindings, allowlist toggles. */
function HtmlSanitizeEditor({ node }: { node: HtmlSanitizeNode }) {
  const { tool, updateNode } = useToolBuilder();
  const { t } = useTranslation();
  // The allowlist toggles are tool-wide: applying them to every HTML Sanitize
  // node keeps all sanitizers in a tool consistent.
  const syncAllSanitizers = (changes: Partial<HtmlSanitizeNode>) => {
    for (const n of tool?.nodes ?? []) {
      if (n.type === "html_sanitize") {
        updateNode(n.id, changes);
      }
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label={t("field.description")}>
        <input
          value={node.description ?? ""}
          placeholder={t("sanitize.descPlaceholder")}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("sanitize.input")}>
        <StateSelect
          value={node.input.value}
          onChange={(v) =>
            updateNode(node.id, { input: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("sanitize.input.help")}
        </p>
      </Field>
      <Field label={t("sanitize.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("sanitize.output.help")}
        </p>
      </Field>
      <ToggleRow
        label={t("sanitize.keepStyles")}
        description={t("sanitize.keepStyles.desc")}
        checked={node.allowStyles}
        onChange={(next) => syncAllSanitizers({ allowStyles: next })}
      />
      <ToggleRow
        label={t("sanitize.keepImages")}
        description={t("sanitize.keepImages.desc")}
        checked={node.allowImages}
        onChange={(next) => syncAllSanitizers({ allowImages: next })}
      />
      <p className="text-[11px] text-muted-foreground">
        {t("sanitize.footer")}
      </p>
    </div>
  );
}

/** Sentinel for the "no state bound" option (Radix Select forbids `""`). */
const VIEWPORT_UNBOUND = "__none__";

/** Default simulated-screen select shared by the website nodes. */
function DeviceSelectField({
  node,
}: {
  node: ViewportNode | ConvertHtmlNode | ThemedNode;
}) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <Field label={t("web.defaultScreen")}>
      <Select
        value={node.device ?? "responsive"}
        onValueChange={(v) =>
          updateNode(node.id, { device: v as ViewportDevice })
        }
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder={t("web.pickScreen")} />
        </SelectTrigger>
        <SelectContent>
          {VIEWPORT_DEVICES.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
              {d.width ? ` (${d.width}×${d.height})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        {t("web.defaultScreen.help")}
      </p>
    </Field>
  );
}

/** View Port editor — label, URL, height, optional URL-override binding. */
function ViewportEditor({ node }: { node: ViewportNode }) {
  const { stateNode, updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const states = stateNode?.states ?? [];
  return (
    <div className="flex flex-col gap-4">
      <Field label={t("field.fieldLabel")}>
        <input
          value={node.fieldLabel}
          onChange={(e) => updateNode(node.id, { fieldLabel: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("field.description")}>
        <input
          value={node.description ?? ""}
          placeholder={t("field.descPlaceholder")}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("viewport.url")}>
        <input
          value={node.url}
          placeholder="https://example.com"
          onChange={(e) => updateNode(node.id, { url: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("viewport.url.help")}
        </p>
      </Field>
      <PreviewToggleField node={node} />
      <DeviceSelectField node={node} />
      <EditorHeightField node={node} />
      <Field label={t("viewport.urlState")}>
        <Select
          value={node.binding.value || VIEWPORT_UNBOUND}
          onValueChange={(v) =>
            updateNode(node.id, {
              binding: { mode: "name", value: v === VIEWPORT_UNBOUND ? "" : v },
            })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder={t("field.none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VIEWPORT_UNBOUND}>{t("field.none")}</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {t("viewport.urlState.help")}
        </p>
      </Field>
      <p className="text-[11px] text-muted-foreground">
        {t("viewport.footer")}
      </p>
    </div>
  );
}

/** Sentinel for "snapshot the first View Port" (Radix Select forbids `""`). */
const SOURCE_AUTO = "__auto__";

/** Convert to HTML editor — label, source View Port, output state, height. */
function ConvertHtmlEditor({ node }: { node: ConvertHtmlNode }) {
  const { tool, updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const viewports = (tool?.nodes ?? []).filter((n) => n.type === "viewport");
  return (
    <div className="flex flex-col gap-4">
      <Field label={t("field.fieldLabel")}>
        <input
          value={node.fieldLabel}
          onChange={(e) => updateNode(node.id, { fieldLabel: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("field.description")}>
        <input
          value={node.description ?? ""}
          placeholder={t("field.descPlaceholder")}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("convert.source")}>
        <Select
          value={node.source || SOURCE_AUTO}
          onValueChange={(v) =>
            updateNode(node.id, { source: v === SOURCE_AUTO ? "" : v })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder={t("convert.pickVp")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SOURCE_AUTO}>{t("convert.auto")}</SelectItem>
            {viewports.map((v, i) => (
              <SelectItem key={v.id} value={v.id}>
                #{i + 1} {v.fieldLabel || t("convert.vpFallback")}
                {v.url ? ` · ${v.url}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {viewports.length === 0
            ? t("convert.source.helpEmpty")
            : t("convert.source.help")}
        </p>
      </Field>
      <Field label={t("convert.output")}>
        <StateSelect
          value={node.binding.value}
          onChange={(v) =>
            updateNode(node.id, { binding: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("convert.output.help")}
        </p>
      </Field>
      <PreviewToggleField node={node} />
      <DeviceSelectField node={node} />
      <EditorHeightField node={node} />
      <p className="text-[11px] text-muted-foreground">{t("convert.footer")}</p>
    </div>
  );
}

/** Themed editor — label, HTML state binding, frame height. */
function ThemedEditor({ node }: { node: ThemedNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <Field label={t("field.fieldLabel")}>
        <input
          value={node.fieldLabel}
          onChange={(e) => updateNode(node.id, { fieldLabel: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("field.description")}>
        <input
          value={node.description ?? ""}
          placeholder={t("field.descPlaceholder")}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("themed.htmlState")}>
        <StateSelect
          value={node.binding.value}
          onChange={(v) =>
            updateNode(node.id, { binding: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("themed.htmlState.help")}
        </p>
      </Field>
      <PreviewToggleField node={node} />
      <DeviceSelectField node={node} />
      <EditorHeightField node={node} />
      <p className="text-[11px] text-muted-foreground">{t("themed.footer")}</p>
    </div>
  );
}

/** Shared label + description fields used by the simple input editors. */
function LabelDescFields({
  node,
}: {
  node: NumberNode | SelectNode | ToggleNode | DateNode | FileNode | ImageNode;
}) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <>
      <Field label={t("field.fieldLabel")}>
        <input
          value={node.fieldLabel}
          onChange={(e) => updateNode(node.id, { fieldLabel: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label={t("field.description")}>
        <input
          value={node.description ?? ""}
          placeholder={t("field.descPlaceholder")}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
    </>
  );
}

/** Number editor — label, description, min / max / step, state binding. */
function NumberEditor({ node }: { node: NumberNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const numField = (key: "min" | "max" | "step", label: string) => (
    <Field label={label}>
      <input
        type="number"
        value={node[key]}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            updateNode(node.id, { [key]: n });
          }
        }}
        className={inputCls}
      />
    </Field>
  );
  return (
    <div className="flex flex-col gap-4">
      <LabelDescFields node={node} />
      <div className="grid grid-cols-3 gap-2">
        {numField("min", t("number.min"))}
        {numField("max", t("number.max"))}
        {numField("step", t("number.step"))}
      </div>
      <BindingControl node={node} />
      <p className="text-[11px] text-muted-foreground">{t("number.help")}</p>
    </div>
  );
}

/** Select editor — label, static options list, optional options-from-state binding. */
function SelectEditor({ node }: { node: SelectNode }) {
  const { stateNode, updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const states = stateNode?.states ?? [];
  const setOptions = (options: SelectOption[]) =>
    updateNode(node.id, { options });
  return (
    <div className="flex flex-col gap-4">
      <LabelDescFields node={node} />
      <Field label={t("select.options")}>
        <div className="flex flex-col gap-1.5">
          {node.options.map((o) => (
            <div key={o.id} className="flex items-center gap-1.5">
              <input
                value={o.label}
                placeholder={t("select.labelPlaceholder")}
                onChange={(e) =>
                  setOptions(
                    node.options.map((x) =>
                      x.id === o.id ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                className={inputCls}
              />
              <input
                value={o.value}
                placeholder={t("select.valuePlaceholder")}
                onChange={(e) =>
                  setOptions(
                    node.options.map((x) =>
                      x.id === o.id ? { ...x, value: e.target.value } : x,
                    ),
                  )
                }
                className={cn(inputCls, "font-mono")}
              />
              <button
                type="button"
                aria-label={t("select.removeOption")}
                onClick={() =>
                  setOptions(node.options.filter((x) => x.id !== o.id))
                }
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-destructive/10 hover:text-destructive active:scale-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setOptions([
              ...node.options,
              {
                id: uuid(),
                value: `option${node.options.length + 1}`,
                label: `Option ${node.options.length + 1}`,
              },
            ])
          }
          className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-[0.98]"
        >
          <Plus size={14} /> {t("select.addOption")}
        </button>
      </Field>
      <Field label={t("select.optionsState")}>
        <Select
          value={node.optionsBinding.value || VIEWPORT_UNBOUND}
          onValueChange={(v) =>
            updateNode(node.id, {
              optionsBinding: {
                mode: "name",
                value: v === VIEWPORT_UNBOUND ? "" : v,
              },
            })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder={t("field.none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VIEWPORT_UNBOUND}>{t("field.none")}</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {t("select.optionsState.help")}
        </p>
      </Field>
      <BindingControl node={node} />
    </div>
  );
}

/** Toggle editor — label, description, state binding. */
function ToggleEditor({ node }: { node: ToggleNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <LabelDescFields node={node} />
      <BindingControl node={node} />
      <p className="text-[11px] text-muted-foreground">{t("toggle.help")}</p>
    </div>
  );
}

/** Date / Time editor — label, picker mode, state binding. */
function DateEditor({ node }: { node: DateNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <LabelDescFields node={node} />
      <Field label={t("date.mode")}>
        <Select
          value={node.mode}
          onValueChange={(v) =>
            updateNode(node.id, { mode: v as DateTimeMode })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {t("date.mode.help")}
        </p>
      </Field>
      <BindingControl node={node} />
    </div>
  );
}

/** File upload editor — label, output encoding, accept filter, state binding. */
function FileEditor({ node }: { node: FileNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <LabelDescFields node={node} />
      <Field label={t("file.format")}>
        <Select
          value={node.outputFormat}
          onValueChange={(v) =>
            updateNode(node.id, { outputFormat: v as FileOutputFormat })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILE_OUTPUT_FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {t("file.format.help")}
        </p>
      </Field>
      <Field label={t("file.accept")}>
        <input
          value={node.accept}
          placeholder=".pdf,.txt,image/*"
          onChange={(e) => updateNode(node.id, { accept: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("file.accept.help")}
        </p>
      </Field>
      <BindingControl node={node} />
    </div>
  );
}

/** Image upload editor — label, description, state binding. */
function ImageEditor({ node }: { node: ImageNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <LabelDescFields node={node} />
      <BindingControl node={node} />
      <p className="text-[11px] text-muted-foreground">{t("image.help")}</p>
    </div>
  );
}

/** Description field shared by the logic transform editors. */
function DescriptionField({
  node,
}: {
  node:
    | HttpRequestNode
    | FilterNode
    | MapNode
    | SortNode
    | MergeNode
    | TemplateNode
    | RegexNode
    | JsonPathNode
    | MathNode
    | SchemaValidateNode
    | EncodeNode;
}) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <Field label={t("field.description")}>
      <input
        value={node.description ?? ""}
        placeholder={t("field.descPlaceholder")}
        onChange={(e) => updateNode(node.id, { description: e.target.value })}
        className={inputCls}
      />
    </Field>
  );
}

/**
 * Input / output state-slot picker pair shared by the logic transform editors.
 * Generic over which binding fields the node exposes via render props.
 */
function InOutFields({
  inValue,
  outValue,
  onIn,
  onOut,
  inLabel,
  outLabel,
}: {
  inValue?: string;
  outValue: string;
  onIn?: (v: string) => void;
  onOut: (v: string) => void;
  inLabel?: string;
  outLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      {onIn && (
        <Field label={inLabel ?? t("logic.input")}>
          <StateSelect value={inValue ?? ""} onChange={onIn} />
        </Field>
      )}
      <Field label={outLabel ?? t("logic.output")}>
        <StateSelect value={outValue} onChange={onOut} />
      </Field>
    </>
  );
}

/** HTTP Request editor — method, URL, headers, body, response type, output. */
function HttpRequestEditor({ node }: { node: HttpRequestNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const setHeaders = (headers: HttpRequestNode["headers"]) =>
    updateNode(node.id, { headers });
  const bodyless = node.method === "GET" || node.method === "DELETE";
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <Field label={t("http.method")}>
        <Select
          value={node.method}
          onValueChange={(v) =>
            updateNode(node.id, { method: v as HttpMethod })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("http.url")}>
        <input
          value={node.url}
          placeholder="https://api.example.com/{{id}}"
          onChange={(e) => updateNode(node.id, { url: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("http.url.help")}
        </p>
      </Field>
      <Field label={t("http.headers")}>
        <div className="flex flex-col gap-1.5">
          {node.headers.map((h) => (
            <div key={h.id} className="flex items-center gap-1.5">
              <input
                value={h.key}
                placeholder={t("http.headerKey")}
                onChange={(e) =>
                  setHeaders(
                    node.headers.map((x) =>
                      x.id === h.id ? { ...x, key: e.target.value } : x,
                    ),
                  )
                }
                className={cn(inputCls, "font-mono")}
              />
              <input
                value={h.value}
                placeholder={t("http.headerValue")}
                onChange={(e) =>
                  setHeaders(
                    node.headers.map((x) =>
                      x.id === h.id ? { ...x, value: e.target.value } : x,
                    ),
                  )
                }
                className={cn(inputCls, "font-mono")}
              />
              <button
                type="button"
                aria-label={t("http.removeHeader")}
                onClick={() =>
                  setHeaders(node.headers.filter((x) => x.id !== h.id))
                }
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-destructive/10 hover:text-destructive active:scale-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setHeaders([...node.headers, { id: uuid(), key: "", value: "" }])
          }
          className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-[0.98]"
        >
          <Plus size={14} /> {t("http.addHeader")}
        </button>
      </Field>
      {!bodyless && (
        <Field label={t("http.body")}>
          <textarea
            value={node.body}
            onChange={(e) => updateNode(node.id, { body: e.target.value })}
            rows={4}
            className={cn(inputCls, "h-auto resize-y py-2 font-mono")}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("http.body.help")}
          </p>
        </Field>
      )}
      <Field label={t("http.responseType")}>
        <Select
          value={node.responseType}
          onValueChange={(v) =>
            updateNode(node.id, { responseType: v as HttpResponseType })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HTTP_RESPONSE_TYPES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("logic.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("http.output.help")}
        </p>
      </Field>
      <p className="text-[11px] text-muted-foreground">{t("http.footer")}</p>
    </div>
  );
}

/** Filter editor — input, field path, operator, value, output. */
function FilterEditor({ node }: { node: FilterNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const valueless = VALUELESS_FILTER_OPERATORS.has(node.operator);
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <InOutFields
        inValue={node.input.value}
        outValue={node.output.value}
        onIn={(v) => updateNode(node.id, { input: { mode: "name", value: v } })}
        onOut={(v) =>
          updateNode(node.id, { output: { mode: "name", value: v } })
        }
      />
      <Field label={t("logic.field")}>
        <input
          value={node.field}
          placeholder="status"
          onChange={(e) => updateNode(node.id, { field: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("logic.field.help")}
        </p>
      </Field>
      <Field label={t("filter.operator")}>
        <Select
          value={node.operator}
          onValueChange={(v) =>
            updateNode(node.id, { operator: v as FilterOperator })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPERATORS.map((op) => (
              <SelectItem key={op} value={op}>
                {t(`filter.op.${op}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {!valueless && (
        <Field label={t("filter.value")}>
          <input
            value={node.value}
            onChange={(e) => updateNode(node.id, { value: e.target.value })}
            className={inputCls}
          />
        </Field>
      )}
      <p className="text-[11px] text-muted-foreground">{t("filter.help")}</p>
    </div>
  );
}

/** Map editor — input, field mapping list, output. */
function MapEditor({ node }: { node: MapNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const setFields = (fields: MapNode["fields"]) =>
    updateNode(node.id, { fields });
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <InOutFields
        inValue={node.input.value}
        outValue={node.output.value}
        onIn={(v) => updateNode(node.id, { input: { mode: "name", value: v } })}
        onOut={(v) =>
          updateNode(node.id, { output: { mode: "name", value: v } })
        }
      />
      <Field label={t("map.fields")}>
        <div className="flex flex-col gap-1.5">
          {node.fields.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5">
              <input
                value={f.to}
                placeholder={t("map.to")}
                onChange={(e) =>
                  setFields(
                    node.fields.map((x) =>
                      x.id === f.id ? { ...x, to: e.target.value } : x,
                    ),
                  )
                }
                className={cn(inputCls, "font-mono")}
              />
              <span className="shrink-0 text-xs text-muted-foreground">←</span>
              <input
                value={f.from}
                placeholder={t("map.from")}
                onChange={(e) =>
                  setFields(
                    node.fields.map((x) =>
                      x.id === f.id ? { ...x, from: e.target.value } : x,
                    ),
                  )
                }
                className={cn(inputCls, "font-mono")}
              />
              <button
                type="button"
                aria-label={t("map.removeField")}
                onClick={() =>
                  setFields(node.fields.filter((x) => x.id !== f.id))
                }
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-destructive/10 hover:text-destructive active:scale-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setFields([...node.fields, { id: uuid(), to: "", from: "" }])
          }
          className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-[0.98]"
        >
          <Plus size={14} /> {t("map.addField")}
        </button>
      </Field>
      <p className="text-[11px] text-muted-foreground">{t("map.help")}</p>
    </div>
  );
}

/** Sort editor — input, field, direction, type, output. */
function SortEditor({ node }: { node: SortNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <InOutFields
        inValue={node.input.value}
        outValue={node.output.value}
        onIn={(v) => updateNode(node.id, { input: { mode: "name", value: v } })}
        onOut={(v) =>
          updateNode(node.id, { output: { mode: "name", value: v } })
        }
      />
      <Field label={t("logic.field")}>
        <input
          value={node.field}
          placeholder="name"
          onChange={(e) => updateNode(node.id, { field: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("logic.field.help")}
        </p>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("sort.direction")}>
          <Select
            value={node.direction}
            onValueChange={(v) =>
              updateNode(node.id, { direction: v as SortDirection })
            }
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_DIRECTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`sort.dir.${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("sort.type")}>
          <Select
            value={node.sortType}
            onValueChange={(v) =>
              updateNode(node.id, { sortType: v as SortType })
            }
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`sort.type.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">{t("sort.help")}</p>
    </div>
  );
}

/** Merge / Join editor — left input, right input, keys, join kind, output. */
function MergeEditor({ node }: { node: MergeNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <Field label={t("logic.input")}>
        <StateSelect
          value={node.input.value}
          onChange={(v) =>
            updateNode(node.id, { input: { mode: "name", value: v } })
          }
        />
      </Field>
      <Field label={t("merge.rightInput")}>
        <StateSelect
          value={node.rightInput.value}
          onChange={(v) =>
            updateNode(node.id, { rightInput: { mode: "name", value: v } })
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("merge.leftKey")}>
          <input
            value={node.leftKey}
            onChange={(e) => updateNode(node.id, { leftKey: e.target.value })}
            className={cn(inputCls, "font-mono")}
          />
        </Field>
        <Field label={t("merge.rightKey")}>
          <input
            value={node.rightKey}
            onChange={(e) => updateNode(node.id, { rightKey: e.target.value })}
            className={cn(inputCls, "font-mono")}
          />
        </Field>
      </div>
      <Field label={t("merge.joinKind")}>
        <Select
          value={node.joinKind}
          onValueChange={(v) =>
            updateNode(node.id, { joinKind: v as JoinKind })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOIN_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(`merge.join.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("logic.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">{t("merge.help")}</p>
    </div>
  );
}

/** Template editor — template text, output. */
function TemplateEditor({ node }: { node: TemplateNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <Field label={t("template.template")}>
        <textarea
          value={node.template}
          onChange={(e) => updateNode(node.id, { template: e.target.value })}
          rows={4}
          className={cn(inputCls, "h-auto resize-y py-2 font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("template.template.help")}
        </p>
      </Field>
      <Field label={t("logic.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
      </Field>
    </div>
  );
}

/** Regex editor — input, pattern, flags, mode, replacement, output. */
function RegexEditor({ node }: { node: RegexNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <InOutFields
        inValue={node.input.value}
        outValue={node.output.value}
        onIn={(v) => updateNode(node.id, { input: { mode: "name", value: v } })}
        onOut={(v) =>
          updateNode(node.id, { output: { mode: "name", value: v } })
        }
      />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label={t("regex.pattern")}>
          <input
            value={node.pattern}
            placeholder="\\d+"
            onChange={(e) => updateNode(node.id, { pattern: e.target.value })}
            className={cn(inputCls, "font-mono")}
          />
        </Field>
        <Field label={t("regex.flags")}>
          <input
            value={node.flags}
            placeholder="gi"
            onChange={(e) => updateNode(node.id, { flags: e.target.value })}
            className={cn(inputCls, "w-16 font-mono")}
          />
        </Field>
      </div>
      <Field label={t("regex.mode")}>
        <Select
          value={node.mode}
          onValueChange={(v) => updateNode(node.id, { mode: v as RegexMode })}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGEX_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {t(`regex.mode.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {node.mode === "replace" && (
        <Field label={t("regex.replacement")}>
          <input
            value={node.replacement}
            placeholder="$1"
            onChange={(e) =>
              updateNode(node.id, { replacement: e.target.value })
            }
            className={cn(inputCls, "font-mono")}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("regex.replacement.help")}
          </p>
        </Field>
      )}
      <p className="text-[11px] text-muted-foreground">{t("regex.help")}</p>
    </div>
  );
}

/** JSONPath editor — input, path, output. */
function JsonPathEditor({ node }: { node: JsonPathNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <InOutFields
        inValue={node.input.value}
        outValue={node.output.value}
        onIn={(v) => updateNode(node.id, { input: { mode: "name", value: v } })}
        onOut={(v) =>
          updateNode(node.id, { output: { mode: "name", value: v } })
        }
      />
      <Field label={t("jsonpath.path")}>
        <input
          value={node.path}
          placeholder="data.items[0].name"
          onChange={(e) => updateNode(node.id, { path: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("jsonpath.path.help")}
        </p>
      </Field>
      <p className="text-[11px] text-muted-foreground">{t("jsonpath.help")}</p>
      <details className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground select-none">
          {t("jsonpath.docs.title")}
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
          {t("jsonpath.docs")}
        </pre>
      </details>
    </div>
  );
}

/** Math editor — expression, output. */
function MathEditor({ node }: { node: MathNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <Field label={t("math.expression")}>
        <input
          value={node.expression}
          placeholder="price * qty"
          onChange={(e) => updateNode(node.id, { expression: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("math.expression.help")}
        </p>
      </Field>
      <Field label={t("logic.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
      </Field>
      <details className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground select-none">
          {t("math.docs.title")}
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
          {t("math.docs")}
        </pre>
      </details>
    </div>
  );
}

/** Schema Validate editor — input, rule list, output, error output. */
function SchemaValidateEditor({ node }: { node: SchemaValidateNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  const setRules = (rules: SchemaValidateNode["rules"]) =>
    updateNode(node.id, { rules });
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <Field label={t("logic.input")}>
        <StateSelect
          value={node.input.value}
          onChange={(v) =>
            updateNode(node.id, { input: { mode: "name", value: v } })
          }
        />
      </Field>
      <Field label={t("schema.rules")}>
        <div className="flex flex-col gap-1.5">
          {node.rules.map((r) => (
            <div key={r.id} className="flex items-center gap-1.5">
              <input
                value={r.field}
                placeholder={t("schema.ruleField")}
                onChange={(e) =>
                  setRules(
                    node.rules.map((x) =>
                      x.id === r.id ? { ...x, field: e.target.value } : x,
                    ),
                  )
                }
                className={cn(inputCls, "font-mono")}
              />
              <Select
                value={r.type}
                onValueChange={(v) =>
                  setRules(
                    node.rules.map((x) =>
                      x.id === r.id
                        ? { ...x, type: v as SchemaRule["type"] }
                        : x,
                    ),
                  )
                }
              >
                <SelectTrigger className="h-8 w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMA_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`schema.type.${tp}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-label={t("schema.removeRule")}
                onClick={() =>
                  setRules(node.rules.filter((x) => x.id !== r.id))
                }
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-destructive/10 hover:text-destructive active:scale-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setRules([...node.rules, { id: uuid(), field: "", type: "any" }])
          }
          className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-[0.98]"
        >
          <Plus size={14} /> {t("schema.addRule")}
        </button>
      </Field>
      <Field label={t("logic.output")}>
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
      </Field>
      <Field label={t("schema.errorOutput")}>
        <StateSelect
          value={node.errorOutput.value}
          onChange={(v) =>
            updateNode(node.id, { errorOutput: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          {t("schema.errorOutput.help")}
        </p>
      </Field>
      <p className="text-[11px] text-muted-foreground">{t("schema.help")}</p>
    </div>
  );
}

/** Encode / Decode editor — input, operation, output. */
function EncodeEditor({ node }: { node: EncodeNode }) {
  const { updateNode } = useToolBuilder();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DescriptionField node={node} />
      <InOutFields
        inValue={node.input.value}
        outValue={node.output.value}
        onIn={(v) => updateNode(node.id, { input: { mode: "name", value: v } })}
        onOut={(v) =>
          updateNode(node.id, { output: { mode: "name", value: v } })
        }
      />
      <Field label={t("encode.operation")}>
        <Select
          value={node.operation}
          onValueChange={(v) =>
            updateNode(node.id, { operation: v as EncodeOperation })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENCODE_OPERATIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <p className="text-[11px] text-muted-foreground">{t("encode.help")}</p>
    </div>
  );
}

/** Per-type editor body. */
function EditorBody({
  node,
  placement,
}: {
  node: ToolNode;
  placement: EditorPlacement;
}) {
  const { updateNode, stateNode } = useToolBuilder();
  const { t } = useTranslation();

  switch (node.type) {
    case "state":
      return <StateEditor node={node} />;
    case "ai":
      return <AiEditor node={node} placement={placement} />;
    case "code": {
      const isPanel = placement === "panel";
      return (
        <div className={cn("flex flex-col gap-4", isPanel && "flex-1 min-h-0")}>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("code.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field
            label={t("code.code")}
            className={isPanel ? "flex-1 min-h-0" : undefined}
          >
            <CodeEditor
              language="javascript"
              height={isPanel ? "100%" : 320}
              className={isPanel ? "flex-1 min-h-0" : undefined}
              value={node.code}
              onChange={(code) => updateNode(node.id, { code })}
              aiProvider={node.aiProvider}
              onAiProviderChange={(aiProvider) =>
                updateNode(node.id, { aiProvider })
              }
              aiModel={node.aiModel}
              onAiModelChange={(aiModel) => updateNode(node.id, { aiModel })}
              stateSlots={stateNode?.states}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("code.code.help")}
            </p>
          </Field>
        </div>
      );
    }
    case "ts_type":
      return <TsTypeEditor node={node} />;
    case "html_sanitize":
      return <HtmlSanitizeEditor node={node} />;
    case "viewport":
      return <ViewportEditor node={node} />;
    case "convert_html":
      return <ConvertHtmlEditor node={node} />;
    case "themed":
      return <ThemedEditor node={node} />;
    case "http_request":
      return <HttpRequestEditor node={node} />;
    case "filter":
      return <FilterEditor node={node} />;
    case "map":
      return <MapEditor node={node} />;
    case "sort":
      return <SortEditor node={node} />;
    case "merge":
      return <MergeEditor node={node} />;
    case "template":
      return <TemplateEditor node={node} />;
    case "regex":
      return <RegexEditor node={node} />;
    case "jsonpath":
      return <JsonPathEditor node={node} />;
    case "math":
      return <MathEditor node={node} />;
    case "schema_validate":
      return <SchemaValidateEditor node={node} />;
    case "encode":
      return <EncodeEditor node={node} />;
    case "number":
      return <NumberEditor node={node} />;
    case "select":
      return <SelectEditor node={node} />;
    case "toggle":
      return <ToggleEditor node={node} />;
    case "date":
      return <DateEditor node={node} />;
    case "file":
      return <FileEditor node={node} />;
    case "image":
      return <ImageEditor node={node} />;
    case "canvas": {
      const isPanel = placement === "panel";
      return (
        <div className={cn("flex flex-col gap-4", isPanel && "flex-1 min-h-0")}>
          <Field label={t("canvas.elementId")}>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
                {node.elementId}
              </code>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(node.elementId).catch(() => {})
                }
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-[0.98]"
              >
                <Copy size={14} /> {t("common.copy")}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("canvas.elementId.help")}
            </p>
          </Field>
          <Field
            label={t("canvas.htmljs")}
            className={isPanel ? "flex-1 min-h-0" : undefined}
          >
            <CodeEditor
              language="html"
              height={isPanel ? "100%" : 300}
              className={isPanel ? "flex-1 min-h-0" : undefined}
              value={node.html}
              onChange={(html) => updateNode(node.id, { html })}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("canvas.htmljs.help")}
            </p>
          </Field>
        </div>
      );
    }
    case "text_run":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("field.fieldLabel")}>
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.placeholder")}>
            <input
              value={node.placeholder}
              onChange={(e) =>
                updateNode(node.id, { placeholder: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <ToggleRow
            label={t("toggle.runButton")}
            description={t("toggle.runButton.desc")}
            checked={node.runEnabled}
            onChange={(next) => updateNode(node.id, { runEnabled: next })}
          />
          {node.runEnabled && (
            <Field label={t("field.runButtonText")}>
              <input
                value={node.buttonText}
                onChange={(e) =>
                  updateNode(node.id, { buttonText: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          )}
          <RunTargets node={node} />
          <ToggleRow
            label={t("toggle.resetButton")}
            description={t("toggle.resetButton.descText")}
            checked={node.resetEnabled}
            onChange={(next) => updateNode(node.id, { resetEnabled: next })}
          />
          {node.resetEnabled && (
            <>
              <Field label={t("field.resetButtonText")}>
                <input
                  value={node.resetText}
                  onChange={(e) =>
                    updateNode(node.id, { resetText: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <ResetTargets node={node} />
            </>
          )}
          <BindingControl node={node} />
        </div>
      );
    case "button":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("button.labelOptional")}>
            <input
              value={node.fieldLabel}
              placeholder={t("button.labelPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.buttonText")}>
            <input
              value={node.buttonText}
              onChange={(e) =>
                updateNode(node.id, { buttonText: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <ToggleRow
            label={t("toggle.resetButton")}
            description={t("toggle.resetButton.descButton")}
            checked={node.resetEnabled}
            onChange={(next) => updateNode(node.id, { resetEnabled: next })}
          />
          {node.resetEnabled && (
            <Field label={t("field.resetButtonText")}>
              <input
                value={node.resetText}
                onChange={(e) =>
                  updateNode(node.id, { resetText: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          )}
          <RunTargets node={node} />
          {node.resetEnabled && <ResetTargets node={node} />}
          <p className="text-[11px] text-muted-foreground">
            {t("button.footer")}
          </p>
        </div>
      );
    case "textarea":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("field.fieldLabel")}>
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.placeholder")}>
            <input
              value={node.placeholder}
              onChange={(e) =>
                updateNode(node.id, { placeholder: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <EditorHeightField node={node} />
          <BindingControl node={node} />
        </div>
      );
    case "markdown":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("field.fieldLabel")}>
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.placeholder")}>
            <input
              value={node.placeholder}
              onChange={(e) =>
                updateNode(node.id, { placeholder: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <EditorHeightField node={node} />
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">
            {t("markdown.help")}
          </p>
        </div>
      );
    case "json":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("field.fieldLabel")}>
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <EditorHeightField node={node} />
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">{t("json.help")}</p>
        </div>
      );
    case "csv":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("field.fieldLabel")}>
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <ToggleRow
            label={t("csv.header")}
            description={t("csv.header.desc")}
            checked={node.hasHeader}
            onChange={(next) => updateNode(node.id, { hasHeader: next })}
          />
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">{t("csv.help")}</p>
        </div>
      );
    case "table":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("field.fieldLabel")}>
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("table.rowsPerPage")}>
            <Select
              value={String(node.pageSize)}
              onValueChange={(v) =>
                updateNode(node.id, { pageSize: Number(v) as TablePageSize })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder={t("table.pickPageSize")} />
              </SelectTrigger>
              <SelectContent>
                {TABLE_PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {t("table.rows", { n: s })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t("table.help", { sizes: TABLE_PAGE_SIZES.join(" / ") })}
            </p>
          </Field>
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">
            {t("table.footer")}
          </p>
        </div>
      );
    case "code_input":
      return (
        <div className="flex flex-col gap-4">
          <Field label={t("field.fieldLabel")}>
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("field.description")}>
            <input
              value={node.description ?? ""}
              placeholder={t("field.descPlaceholder")}
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label={t("codeInput.language")}>
            <Select
              value={node.language}
              onValueChange={(v) =>
                updateNode(node.id, { language: v as CodeInputLanguage })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder={t("codeInput.pickLanguage")} />
              </SelectTrigger>
              <SelectContent>
                {CODE_INPUT_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t("codeInput.language.help")}
            </p>
          </Field>
          <EditorHeightField node={node} />
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">
            {t("codeInput.help")}
          </p>
        </div>
      );
  }
}

/**
 * Node configuration editor. Renders the right header (with a back chevron in
 * `panel` placement, a close button otherwise) and the per-type body.
 *
 * @param props.node - Node being edited.
 * @param props.placement - Where this editor is surfaced (drives chrome).
 */
export function NodeEditor({
  node,
  placement,
}: {
  node: ToolNode;
  placement: EditorPlacement;
}) {
  const { clearNodeSelection, deleteNode } = useToolBuilder();
  const { t } = useTranslation();
  const meta = NODE_META[node.type];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        placement === "panel" && "h-full min-h-0",
      )}
    >
      <div className="flex items-center gap-2">
        {placement === "panel" && (
          <button
            type="button"
            aria-label={t("node.back")}
            onClick={clearNodeSelection}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md",
            ACCENT_CLASSES[meta.accent],
          )}
        >
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {t(`node.${node.type}.label`)}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {meta.slug}
          </div>
        </div>
        <button
          type="button"
          aria-label={t("node.delete")}
          onClick={() => deleteNode(node.id)}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <Trash2 size={14} />
        </button>
        {placement !== "panel" && (
          <button
            type="button"
            aria-label={t("node.close")}
            onClick={clearNodeSelection}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-95"
          >
            <X size={15} />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t(`node.${node.type}.blurb`)}
      </p>
      <hr className="border-border" />
      <EditorBody node={node} placement={placement} />
    </div>
  );
}
