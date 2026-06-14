/**
 * Bridge the open tool's live domain data into the plain, prompt-ready shapes
 * the Builder chat assistant needs. Pure — no React, no Redux. Reads the node
 * catalogue (`@/lib/node-catalog`), per-node subtitles (`nodeSubtitle`), and
 * static node labels/slugs (`NODE_META`), and never surfaces internal ids
 * (node ids, organization id) to the model.
 *
 * The result feeds `buildChatSystemPrompt` from `@/constants/ai-prompts`, which
 * owns all prompt *wording*; this file only gathers the data.
 */

import type {
  ChatNodeCatalogEntry,
  ChatNodeDoc,
  ChatToolNodeSummary,
} from "@/constants/ai-prompts";
import { nodeDocsContext } from "@/constants/ai-prompts";
import { NODE_META } from "@/constants/tool-builder";
import type { AiTool } from "@/lib/ai-providers";
import { getNodeReference, getNodeReferenceFor } from "@/lib/node-catalog";
import { nodeSubtitle } from "@/lib/tool-builder-runtime";
import type { StateNode, Tool, ToolNodeType } from "@/types/tool-builder";

/** Everything the chat assistant needs to know about the open tool. */
export interface ChatToolContext {
  toolName: string | null;
  nodes: ChatToolNodeSummary[];
  catalog: ChatNodeCatalogEntry[];
  docs: ChatNodeDoc[];
}

/** Distinct node types in `tool`, in first-seen (chain) order. */
function usedNodeTypes(tool: Tool | null): ToolNodeType[] {
  const seen: ToolNodeType[] = [];
  for (const node of tool?.nodes ?? []) {
    if (!seen.includes(node.type)) {
      seen.push(node.type);
    }
  }
  return seen;
}

/**
 * Derive the chat assistant's grounding context from the open tool.
 *
 * @param tool - The open tool, or null when none is open.
 * @param stateNode - The tool's State Control node (for binding subtitles).
 * @returns The connected node chain, the compact catalog of every node type,
 *   and in-depth docs for the node types this tool uses.
 */
export function buildChatToolContext(
  tool: Tool | null,
  stateNode: StateNode | null,
): ChatToolContext {
  const nodes: ChatToolNodeSummary[] = (tool?.nodes ?? []).map((node, i) => {
    const meta = NODE_META[node.type];
    const sub = nodeSubtitle(node, stateNode);
    const value = sub?.value;
    const detail =
      sub && value !== undefined && `${value}` !== ""
        ? `${sub.label}: ${value}`
        : sub
          ? sub.label
          : undefined;
    return { index: i + 1, label: meta.label, slug: meta.slug, detail };
  });

  const docs = usedNodeTypes(tool)
    .map((type): ChatNodeDoc | null => {
      const ref = getNodeReferenceFor(type);
      if (!ref) {
        return null;
      }
      return {
        slug: ref.slug,
        label: ref.label,
        summary: ref.summary,
        whenToUse: ref.whenToUse,
        config: ref.config.map((c) => c.name),
        reads: ref.io.reads,
        writes: ref.io.writes,
        tips: ref.tips,
      };
    })
    .filter((d): d is ChatNodeDoc => d !== null);

  const catalog: ChatNodeCatalogEntry[] = getNodeReference().map((r) => ({
    slug: r.slug,
    label: r.label,
    blurb: r.blurb,
  }));

  return { toolName: tool?.name ?? null, nodes, catalog, docs };
}

/**
 * Tool the chat assistant can call to fetch one node type's full documentation
 * on demand — so it can answer about **any** node, not only those in the open
 * tool. Pair with {@link lookupNodeDocs} as the dispatcher.
 */
export const NODE_DOCS_TOOL: AiTool = {
  name: "get_node_docs",
  description:
    "Get full documentation for a Builder node type (summary, when to use, config fields, state I/O, tips). Call this whenever the user asks about a specific node — including nodes not present in the open tool.",
  parameters: {
    type: "object",
    properties: {
      node_type: {
        type: "string",
        description:
          "Which node — its type id, @slug, or label, e.g. 'math', '@math', or 'Math / Expression'.",
      },
    },
    required: ["node_type"],
  },
};

/** Resolve a free-text node reference (type id / @slug / label) to a node type. */
function resolveNodeType(query: string): ToolNodeType | null {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  if (!q) {
    return null;
  }
  const refs = getNodeReference();
  const exact = refs.find(
    (r) =>
      r.type.toLowerCase() === q ||
      r.slug.toLowerCase().replace(/^@/, "") === q ||
      r.label.toLowerCase() === q,
  );
  if (exact) {
    return exact.type;
  }
  const partial = refs.find(
    (r) =>
      r.label.toLowerCase().includes(q) || q.includes(r.type.toLowerCase()),
  );
  return partial?.type ?? null;
}

/**
 * Dispatcher for {@link NODE_DOCS_TOOL}: resolve the requested node and return
 * its full documentation as prompt text, or a not-found hint.
 *
 * @param query - The model-supplied node id / slug / label.
 */
export function lookupNodeDocs(query: string): string {
  const type = resolveNodeType(query);
  const ref = type ? getNodeReferenceFor(type) : undefined;
  if (!ref) {
    return `No node matches "${query}". Check the node catalog in the system prompt for the right @slug.`;
  }
  return nodeDocsContext([
    {
      slug: ref.slug,
      label: ref.label,
      summary: ref.summary,
      whenToUse: ref.whenToUse,
      config: ref.config.map((c) => c.name),
      reads: ref.io.reads,
      writes: ref.io.writes,
      tips: ref.tips,
    },
  ]).trim();
}
