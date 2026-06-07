"use client";

import { ChevronLeft, Copy, Plus, Trash2, X } from "lucide-react";

import { ACCENT_CLASSES, NODE_META, uuid } from "@/constants/tool-builder";
import { useToolBuilder } from "@/hooks/useToolBuilder";
import { cn } from "@/lib/utils";
import type {
  EditorPlacement,
  StateEntry,
  StateNode,
  TextareaNode,
  TextRunNode,
  TextRunResetNode,
  ToolNode,
} from "@/types/tool-builder";

const inputCls =
  "h-8 w-full rounded-md border bg-background px-2.5 text-sm outline-none transition-[box-shadow,border-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

const labelCls = "text-[11px] font-medium text-muted-foreground";

/** A labelled vertical field group. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

/** Binding-mode toggle + target selector shared by all input editors. */
function BindingControl({
  node,
}: {
  node: TextRunResetNode | TextRunNode | TextareaNode;
}) {
  const { stateNode, updateNode } = useToolBuilder();
  const states = stateNode?.states ?? [];
  const { mode, value } = node.binding;

  return (
    <Field label="State binding">
      <div className="inline-flex rounded-md border p-0.5 text-xs">
        {(["name", "index"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => updateNode(node.id, { binding: { mode: m, value } })}
            className={cn(
              "rounded px-2.5 py-1 capitalize transition-colors duration-[var(--motion-duration-fast)]",
              mode === m
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            By {m}
          </button>
        ))}
      </div>
      {mode === "name" ? (
        <div className="relative">
          <select
            value={value}
            onChange={(e) =>
              updateNode(node.id, {
                binding: { mode, value: e.target.value },
              })
            }
            className={cn(inputCls, "appearance-none pr-8")}
          >
            {states.length === 0 && <option value="">— no state —</option>}
            {states.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) =>
            updateNode(node.id, { binding: { mode, value: e.target.value } })
          }
          className={cn(inputCls, "font-mono")}
        />
      )}
      <p className="text-[11px] text-muted-foreground">
        Which state this node reads from / writes to.
      </p>
    </Field>
  );
}

/** State Control editor — manage the shared state slots. */
function StateEditor({ node }: { node: StateNode }) {
  const { updateNode } = useToolBuilder();
  const setStates = (states: StateEntry[]) => updateNode(node.id, { states });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-foreground px-1.5 py-0.5 font-medium text-background">
          Available State [{node.states.length}]
        </span>
        <span>Other nodes bind to these by name or index.</span>
      </div>
      <div className="flex flex-col gap-2">
        {node.states.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-center font-mono text-xs text-muted-foreground">
              {i}
            </span>
            <input
              value={s.name}
              onChange={(e) =>
                setStates(
                  node.states.map((x) =>
                    x.id === s.id ? { ...x, name: e.target.value } : x,
                  ),
                )
              }
              className={cn(inputCls, "font-mono")}
            />
            <input
              value={s.value}
              placeholder="default value"
              onChange={(e) =>
                setStates(
                  node.states.map((x) =>
                    x.id === s.id ? { ...x, value: e.target.value } : x,
                  ),
                )
              }
              className={inputCls}
            />
            <button
              type="button"
              aria-label="Remove state"
              onClick={() =>
                setStates(node.states.filter((x) => x.id !== s.id))
              }
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setStates([...node.states, { id: uuid(), name: "", value: "" }])
        }
        className="inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent active:scale-[0.98]"
      >
        <Plus size={14} /> Add state
      </button>
    </div>
  );
}

/** Mono code/markup textarea used by the Code and Canvas editors. */
function CodeArea({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <textarea
      spellCheck={false}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed outline-none transition-[box-shadow,border-color] duration-[var(--motion-duration-fast)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
    />
  );
}

/** Per-type editor body. */
function EditorBody({ node }: { node: ToolNode }) {
  const { updateNode } = useToolBuilder();

  switch (node.type) {
    case "state":
      return <StateEditor node={node} />;
    case "code":
      return (
        <Field label="Code">
          <CodeArea
            rows={12}
            value={node.code}
            onChange={(code) => updateNode(node.id, { code })}
          />
          <p className="text-[11px] text-muted-foreground">
            Runs top-to-bottom in the chain; reads &amp; writes state directly.
          </p>
        </Field>
      );
    case "canvas":
      return (
        <div className="flex flex-col gap-4">
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
          <Field label="HTML / JS">
            <CodeArea
              rows={8}
              value={node.html}
              onChange={(html) => updateNode(node.id, { html })}
            />
            <p className="text-[11px] text-muted-foreground">
              Populates the div above.
            </p>
          </Field>
        </div>
      );
    case "text_run_reset":
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
          <Field label="Placeholder">
            <input
              value={node.placeholder}
              onChange={(e) =>
                updateNode(node.id, { placeholder: e.target.value })
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
          <Field label="Reset button text">
            <input
              value={node.resetText}
              onChange={(e) =>
                updateNode(node.id, { resetText: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <BindingControl node={node} />
        </div>
      );
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
          <Field label="Placeholder">
            <input
              value={node.placeholder}
              onChange={(e) =>
                updateNode(node.id, { placeholder: e.target.value })
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
          <BindingControl node={node} />
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
          <Field label="Placeholder">
            <input
              value={node.placeholder}
              onChange={(e) =>
                updateNode(node.id, { placeholder: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <BindingControl node={node} />
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
    <div className="flex flex-col gap-3">
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
      <EditorBody node={node} />
    </div>
  );
}
