"use client";

import {
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
import {
  ACCENT_CLASSES,
  CODE_INPUT_LANGUAGES,
  EDITOR_HEIGHTS,
  NODE_META,
  TABLE_PAGE_SIZES,
  uuid,
  VIEWPORT_DEVICES,
} from "@/constants/tool-builder";
import { useProviderModels } from "@/hooks/useProviderModels";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { cn } from "@/lib/utils";
import type {
  AiNode,
  ButtonNode,
  CodeInputLanguage,
  CodeInputNode,
  CsvNode,
  EditorPlacement,
  JsonNode,
  MarkdownNode,
  StateEntry,
  StateNode,
  TableNode,
  TablePageSize,
  TextareaNode,
  TextRunNode,
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
  const states = stateNode?.states ?? [];
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={states.length === 0}
    >
      <SelectTrigger className="h-8 w-full">
        <SelectValue
          placeholder={states.length === 0 ? "— no state —" : "Pick state…"}
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
    | TextareaNode
    | MarkdownNode
    | JsonNode
    | CsvNode
    | TableNode
    | CodeInputNode;
}) {
  const { stateNode, updateNode } = useToolBuilder();
  const states = stateNode?.states ?? [];
  const { value } = node.binding;

  return (
    <Field label="State binding">
      <Select
        value={value || undefined}
        onValueChange={(v) =>
          updateNode(node.id, { binding: { mode: "name", value: v } })
        }
        disabled={states.length === 0}
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue
            placeholder={states.length === 0 ? "— no state —" : "Pick state…"}
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
        Which state this node reads from / writes to.
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
  node: TextareaNode | MarkdownNode | JsonNode | CodeInputNode | ViewportNode;
}) {
  const { updateNode } = useToolBuilder();
  const fallback = EDITOR_HEIGHTS.defaults[node.type];
  return (
    <Field label="Editor height (px)">
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
        Initial field height in the preview ({EDITOR_HEIGHTS.min}–
        {EDITOR_HEIGHTS.max}px).
      </p>
    </Field>
  );
}

/**
 * Run-target picker for a Button node. Lists the tool's code & AI nodes; the
 * button runs only the checked ones (in chain order). None checked = run all.
 */
function describeRunnable(n: ToolNode): string {
  if (n.type === "code") {
    return n.description?.trim() || "Code";
  }
  if (n.type === "ai") {
    return `AI · ${n.model || "default"}`;
  }
  if (n.type === "ts_type") {
    return n.description?.trim() || "TS Type Converter";
  }
  return NODE_META[n.type].label;
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
  label,
  kinds,
  emptyHint,
  verb,
}: {
  node: ButtonNode;
  field: "targets" | "resetTargets";
  label: string;
  kinds: ToolNodeType[];
  emptyHint: string;
  verb: string;
}) {
  const { tool, updateNode } = useToolBuilder();
  const eligible = (tool?.nodes ?? []).filter((n) => kinds.includes(n.type));
  const current = node[field] ?? [];
  const selected = new Set(current);

  const toggle = (id: string) => {
    const next = selected.has(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    updateNode(node.id, { [field]: next });
  };

  return (
    <Field label={label}>
      {eligible.length === 0 ? (
        <p className="rounded-md border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {eligible.map((n, i) => {
            const Icon = NODE_META[n.type].icon;
            const on = selected.has(n.id);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => toggle(n.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border-2 px-2.5 py-1.5 text-left text-xs transition-colors duration-(--motion-duration-fast)",
                  on
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-transparent bg-muted/40 hover:border-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center border-2 border-current",
                    ACCENT_CLASSES[NODE_META[n.type].accent],
                    on && "bg-transparent",
                  )}
                >
                  <Icon size={11} />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {describeRunnable(n)}
                </span>
                <span className="shrink-0 font-mono opacity-60">#{i + 1}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        {current.length === 0
          ? `Nothing checked — ${verb} the whole chain.`
          : `${verb[0].toUpperCase()}${verb.slice(1)}s ${current.length} selected node${current.length > 1 ? "s" : ""}, in chain order.`}
      </p>
    </Field>
  );
}

function RunTargets({ node }: { node: ButtonNode }) {
  return (
    <TargetSelector
      node={node}
      field="targets"
      label="Run targets"
      kinds={["code", "ts_type", "ai"]}
      emptyHint="No code, TS type, or AI nodes in this tool yet. Add some to target them."
      verb="run"
    />
  );
}

function ResetTargets({ node }: { node: ButtonNode }) {
  return (
    <TargetSelector
      node={node}
      field="resetTargets"
      label="Reset targets"
      kinds={["code"]}
      emptyHint="No code nodes in this tool yet. Add some to target them."
      verb="reset"
    />
  );
}

/** State Control editor — manage the shared state slots. */
function StateEditor({ node }: { node: StateNode }) {
  const { updateNode, renameStateSlot } = useToolBuilder();
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
                  <span className="text-muted-foreground italic">unnamed</span>
                )}
              </div>
              {/* copy button */}
              <button
                type="button"
                aria-label="Copy variable name"
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
                    aria-label="Variable options"
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
                    Rename variable
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      setShowDefaultFor(showDefaultFor === s.id ? null : s.id)
                    }
                  >
                    Set default value
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      setStates(node.states.filter((x) => x.id !== s.id))
                    }
                  >
                    Remove variable
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* collapsible default value row */}
            {showDefaultFor === s.id && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-[var(--motion-duration-fast)]">
                <input
                  value={s.value}
                  placeholder="default value"
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
        <Plus size={14} /> Add state
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
            <DialogTitle>Rename variable</DialogTitle>
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
              Cancel
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
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** AI node editor — provider, model, system, prompt, output binding, key. */
function AiEditor({
  node,
  placement,
}: {
  node: AiNode;
  placement: EditorPlacement;
}) {
  const { updateNode } = useToolBuilder();
  const models = useProviderModels(node.provider);
  const isPanel = placement === "panel";
  return (
    <div className={cn("flex flex-col gap-4", isPanel && "flex-1 min-h-0")}>
      <Field label="Provider">
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
      <Field label="Model">
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
          Pick from list or type any model id.
        </p>
      </Field>
      <Field label="System instruction (optional)">
        <textarea
          value={node.systemInstruction}
          onChange={(e) =>
            updateNode(node.id, { systemInstruction: e.target.value })
          }
          rows={2}
          className={cn(inputCls, "h-auto resize-y py-2")}
        />
      </Field>
      <Field label="Prompt" className={isPanel ? "flex-1 min-h-0" : undefined}>
        <textarea
          value={node.prompt}
          onChange={(e) => updateNode(node.id, { prompt: e.target.value })}
          rows={isPanel ? 8 : 5}
          className={cn(inputCls, "h-auto min-h-24 resize-y py-2 font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          Use <code className="font-mono">{"{{stateName}}"}</code> to
          interpolate state.
        </p>
      </Field>
      <Field label="Output state">
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Model reply writes here.
        </p>
      </Field>
      <ToggleRow
        label="Markdown output"
        description="Render reply as Markdown in the preview."
        checked={node.markdownOutput ?? false}
        onChange={(next) => updateNode(node.id, { markdownOutput: next })}
      />
    </div>
  );
}

/** TS Type Converter editor — description, root name, input/output bindings. */
function TsTypeEditor({ node }: { node: TsTypeNode }) {
  const { updateNode } = useToolBuilder();
  return (
    <div className="flex flex-col gap-4">
      <Field label="Description">
        <input
          value={node.description ?? ""}
          placeholder="What this converter is for"
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label="Root type name">
        <input
          value={node.rootName}
          placeholder="Root"
          onChange={(e) => updateNode(node.id, { rootName: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          Name of the generated top-level interface/type.
        </p>
      </Field>
      <Field label="Input state (JSON source)">
        <StateSelect
          value={node.input.value}
          onChange={(v) =>
            updateNode(node.id, { input: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          State slot holding the JSON to convert — bind a JSON input node here.
        </p>
      </Field>
      <Field label="Output state (TypeScript)">
        <StateSelect
          value={node.output.value}
          onChange={(v) =>
            updateNode(node.id, { output: { mode: "name", value: v } })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Generated declarations write here. Updates live as the JSON changes;
          invalid JSON keeps the last output (runs report the parse error).
        </p>
      </Field>
    </div>
  );
}

/** Sentinel for the "no state bound" option (Radix Select forbids `""`). */
const VIEWPORT_UNBOUND = "__none__";

/** View Port editor — label, URL, height, optional URL-override binding. */
function ViewportEditor({ node }: { node: ViewportNode }) {
  const { stateNode, updateNode } = useToolBuilder();
  const states = stateNode?.states ?? [];
  return (
    <div className="flex flex-col gap-4">
      <Field label="Field label">
        <input
          value={node.fieldLabel}
          onChange={(e) => updateNode(node.id, { fieldLabel: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label="Description">
        <input
          value={node.description ?? ""}
          placeholder="Optional helper text shown below the label"
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label="URL">
        <input
          value={node.url}
          placeholder="https://example.com"
          onChange={(e) => updateNode(node.id, { url: e.target.value })}
          className={cn(inputCls, "font-mono")}
        />
        <p className="text-[11px] text-muted-foreground">
          Page shown in the preview. A bare domain gets{" "}
          <code className="font-mono">https://</code> prepended.
        </p>
      </Field>
      <Field label="Default screen">
        <Select
          value={node.device ?? "responsive"}
          onValueChange={(v) =>
            updateNode(node.id, { device: v as ViewportDevice })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="Pick screen…" />
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
          Screen the preview opens with — end users can still switch between
          fill / desktop / mobile. Fixed screens render at device width and
          scale to fit (width simulation; the site still sees a desktop
          browser).
        </p>
      </Field>
      <EditorHeightField node={node} />
      <Field label="URL state (optional)">
        <Select
          value={node.binding.value || VIEWPORT_UNBOUND}
          onValueChange={(v) =>
            updateNode(node.id, {
              binding: { mode: "name", value: v === VIEWPORT_UNBOUND ? "" : v },
            })
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="— none —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VIEWPORT_UNBOUND}>— none —</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          When the bound state holds a non-empty string it overrides the URL
          above — bind a text input or write it from a code node.
        </p>
      </Field>
      <p className="text-[11px] text-muted-foreground">
        The page loads in a sandboxed iframe. Sites that forbid embedding
        (X-Frame-Options / frame-ancestors) render blank — that is the remote
        site&apos;s policy, not an error in your tool.
      </p>
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
  const { updateNode } = useToolBuilder();

  switch (node.type) {
    case "state":
      return <StateEditor node={node} />;
    case "ai":
      return <AiEditor node={node} placement={placement} />;
    case "code": {
      const isPanel = placement === "panel";
      return (
        <div className={cn("flex flex-col gap-4", isPanel && "flex-1 min-h-0")}>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="What this code block does"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field
            label="Code"
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
            />
            <p className="text-[11px] text-muted-foreground">
              Runs top-to-bottom in the chain; reads &amp; writes state
              directly.
            </p>
          </Field>
        </div>
      );
    }
    case "ts_type":
      return <TsTypeEditor node={node} />;
    case "viewport":
      return <ViewportEditor node={node} />;
    case "canvas": {
      const isPanel = placement === "panel";
      return (
        <div className={cn("flex flex-col gap-4", isPanel && "flex-1 min-h-0")}>
          <Field label="Element ID">
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
                <Copy size={14} /> Copy
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Auto-generated UUID. Target this div from your JS.
            </p>
          </Field>
          <Field
            label="HTML / JS"
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
              Populates the div above.
            </p>
          </Field>
        </div>
      );
    }
    case "text_run":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Field label">
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Placeholder">
            <input
              value={node.placeholder}
              onChange={(e) =>
                updateNode(node.id, { placeholder: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <ToggleRow
            label="Run button"
            description="Show a run button and submit on Enter."
            checked={node.runEnabled}
            onChange={(next) => updateNode(node.id, { runEnabled: next })}
          />
          {node.runEnabled && (
            <Field label="Run button text">
              <input
                value={node.buttonText}
                onChange={(e) =>
                  updateNode(node.id, { buttonText: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          )}
          <ToggleRow
            label="Reset button"
            description="Clear the field after each run and show a reset button."
            checked={node.resetEnabled}
            onChange={(next) => updateNode(node.id, { resetEnabled: next })}
          />
          {node.resetEnabled && (
            <Field label="Reset button text">
              <input
                value={node.resetText}
                onChange={(e) =>
                  updateNode(node.id, { resetText: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          )}
          <BindingControl node={node} />
        </div>
      );
    case "button":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Label (optional)">
            <input
              value={node.fieldLabel}
              placeholder="Heading shown above the button"
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Button text">
            <input
              value={node.buttonText}
              onChange={(e) =>
                updateNode(node.id, { buttonText: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <ToggleRow
            label="Reset button"
            description="Show a reset button beside the action button."
            checked={node.resetEnabled}
            onChange={(next) => updateNode(node.id, { resetEnabled: next })}
          />
          {node.resetEnabled && (
            <Field label="Reset button text">
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
            Runs over current state — no input field.
          </p>
        </div>
      );
    case "textarea":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Field label">
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Placeholder">
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
          <Field label="Field label">
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Placeholder">
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
            End users write Markdown and can toggle a live rendered preview.
          </p>
        </div>
      );
    case "json":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Field label">
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <EditorHeightField node={node} />
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">
            End users paste or edit JSON in a code editor; valid JSON
            auto-formats. The raw source string lands in the bound state — use
            <code className="font-mono"> JSON.parse(state.get(…))</code> in code
            nodes.
          </p>
        </div>
      );
    case "csv":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Field label">
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <ToggleRow
            label="Header row"
            description="First row is column names — rows become objects keyed by header."
            checked={node.hasHeader}
            onChange={(next) => updateNode(node.id, { hasHeader: next })}
          />
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">
            End users upload a .csv file. The parsed rows land in the bound
            state as an array (typed values, empty rows/columns dropped) —
            iterate <code className="font-mono">state.get(…)</code> directly in
            code nodes.
          </p>
        </div>
      );
    case "table":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Field label">
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Rows per page">
            <Select
              value={String(node.pageSize)}
              onValueChange={(v) =>
                updateNode(node.id, { pageSize: Number(v) as TablePageSize })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="Pick page size…" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Default page size in the preview — end users can switch between{" "}
              {TABLE_PAGE_SIZES.join(" / ")}.
            </p>
          </Field>
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">
            Displays the bound state as a table — bind an array (e.g. CSV rows,
            a JSON array, or a code-node result). Data is auto-optimized for
            display; every column sorts (text, numbers, and auto-detected dates)
            and resizes by dragging the header edge.
          </p>
        </div>
      );
    case "code_input":
      return (
        <div className="flex flex-col gap-4">
          <Field label="Field label">
            <input
              value={node.fieldLabel}
              onChange={(e) =>
                updateNode(node.id, { fieldLabel: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <input
              value={node.description ?? ""}
              placeholder="Optional helper text shown below the label"
              onChange={(e) =>
                updateNode(node.id, { description: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Language">
            <Select
              value={node.language}
              onValueChange={(v) =>
                updateNode(node.id, { language: v as CodeInputLanguage })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="Pick language…" />
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
              Drives syntax highlighting in the preview editor.
            </p>
          </Field>
          <EditorHeightField node={node} />
          <BindingControl node={node} />
          <p className="text-[11px] text-muted-foreground">
            End users write or paste code in a Monaco editor. The raw source
            string lands in the bound state — it is never executed.
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
            aria-label="Back to palette"
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
          <div className="truncate text-sm font-semibold">{meta.label}</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {meta.slug}
          </div>
        </div>
        <button
          type="button"
          aria-label="Delete node"
          onClick={() => deleteNode(node.id)}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <Trash2 size={14} />
        </button>
        {placement !== "panel" && (
          <button
            type="button"
            aria-label="Close editor"
            onClick={clearNodeSelection}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-95"
          >
            <X size={15} />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{meta.blurb}</p>
      <hr className="border-border" />
      <EditorBody node={node} placement={placement} />
    </div>
  );
}
