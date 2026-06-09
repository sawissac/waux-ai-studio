/**
 * Static catalogue describing every node type: palette grouping, labels,
 * accent colour, icon, the `@slug` shown in editors, and a factory that
 * produces a fresh node of that type with sensible defaults.
 *
 * Kept beside the feature (not in `src/constants`) because nothing outside
 * Tool Builder consumes it.
 */
import {
  AlignLeft,
  ChevronsLeftRight,
  Columns3,
  Database,
  FormInput,
  type LucideIcon,
  Sparkles,
} from "lucide-react";

import type { NodeAccent, ToolNode, ToolNodeType } from "@/types/tool-builder";

/** Palette section a node type lives under. */
export type PaletteGroup = "Data" | "Inputs" | "Logic" | "Output";

/** Display + behaviour metadata for one node type. */
export interface NodeMeta {
  type: ToolNodeType;
  label: string;
  blurb: string;
  accent: NodeAccent;
  group: PaletteGroup;
  icon: LucideIcon;
  /** Mono `@slug` shown in the editor header. */
  slug: string;
}

/** Tailwind classes for an accent's icon chip (bg + foreground). */
export const ACCENT_CLASSES: Record<NodeAccent, string> = {
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  pink: "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300",
};

/** Per-type metadata, keyed by node type. */
export const NODE_META: Record<ToolNodeType, NodeMeta> = {
  state: {
    type: "state",
    label: "State Control",
    blurb: "Define & manage the shared state this tool operates on.",
    accent: "violet",
    group: "Data",
    icon: Database,
    slug: "@state",
  },
  text_run: {
    type: "text_run",
    label: "Text input",
    blurb:
      "Single-line field that triggers a run. Toggle run & reset to clear after running.",
    accent: "blue",
    group: "Inputs",
    icon: FormInput,
    slug: "@text_run",
  },
  textarea: {
    type: "textarea",
    label: "Textarea input",
    blurb: "Multi-line text field, e.g. a message body.",
    accent: "blue",
    group: "Inputs",
    icon: AlignLeft,
    slug: "@textarea",
  },
  code: {
    type: "code",
    label: "Code",
    blurb: "A code block for custom logic / processing.",
    accent: "amber",
    group: "Logic",
    icon: ChevronsLeftRight,
    slug: "@code",
  },
  canvas: {
    type: "canvas",
    label: "HTML Canvas",
    blurb: "A free-form HTML div you populate with elements via JS.",
    accent: "emerald",
    group: "Output",
    icon: Columns3,
    slug: "@canvas",
  },
  ai: {
    type: "ai",
    label: "AI",
    blurb:
      "Ask Gemini or OpenRouter. Interpolate state via {{name}} in the prompt; reply writes to bound state.",
    accent: "pink",
    group: "Logic",
    icon: Sparkles,
    slug: "@ai",
  },
};

/** Palette order: groups, and node types within each group. */
export const PALETTE_GROUPS: { group: PaletteGroup; types: ToolNodeType[] }[] =
  [
    { group: "Data", types: ["state"] },
    { group: "Inputs", types: ["text_run", "textarea"] },
    { group: "Logic", types: ["code", "ai"] },
    { group: "Output", types: ["canvas"] },
  ];

/** Browser-safe UUID v4. */
export const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_CODE = `// runs when an input above triggers
async function run(state) {
  const email = state.get("email");
  if (!email) return;
  const log = state.get("message") || "";
  state.set("message", log + "Subscribed: " + email + "\\n");
}

// optional: runs live as inputs change
async function change(state) {
  // e.g. state.set("message", state.get("email") || "");
}

// optional: runs when a reset button is clicked
async function reset(state) {
  state.set("email", "");
  state.set("message", "");
}`;

/**
 * Build a fresh node of `type` with default config and a unique id.
 *
 * @param type - Node kind to create.
 * @returns A ready-to-insert {@link ToolNode}.
 */
export function createNode(type: ToolNodeType): ToolNode {
  const id = uuid();
  switch (type) {
    case "state":
      return { id, type, states: [{ id: uuid(), name: "state1", value: "" }] };
    case "text_run":
      return {
        id,
        type,
        fieldLabel: "Field",
        description: "",
        placeholder: "Type here…",
        buttonText: "Run",
        binding: { mode: "name", value: "state1" },
        runEnabled: true,
        resetEnabled: false,
        resetText: "Reset",
      };
    case "textarea":
      return {
        id,
        type,
        fieldLabel: "Message",
        description: "",
        placeholder: "Write a message…",
        binding: { mode: "name", value: "state1" },
      };
    case "code":
      return { id, type, description: "", code: DEFAULT_CODE };
    case "canvas": {
      const elementId = uuid();
      return {
        id,
        type,
        elementId,
        html: `<div id="${elementId}">\n  <h4>Canvas output</h4>\n  <p>Drawn from JS into a plain &lt;div&gt;.</p>\n</div>`,
      };
    }
    case "ai":
      return {
        id,
        type,
        provider: "gemini",
        model: "gemini-2.5-flash",
        systemInstruction: "",
        prompt: "Summarize: {{state1}}",
        output: { mode: "name", value: "state1" },
      };
  }
}
