"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { nodeTypeForSlug } from "@/lib/node-catalog";
import type { ToolNodeType } from "@/types/tool-builder";

/**
 * Fragment prefix used to encode a clickable node-doc link inside rendered
 * Markdown. A `#…` fragment is kept by rehype-sanitize as-is (unlike a custom
 * URL scheme, which it strips), so the `a` renderer can intercept it.
 */
const NODE_DOC_HREF = "#nodedoc:";

/**
 * Pre-process raw Markdown before rendering: normalize `\[ \]` / `\( \)` LaTeX
 * delimiters to `$$`/`$`, unescape doubled backslashes, turn literal `\n` into
 * real newlines, force a blank line before headings / list items that follow a
 * text line, and add a space after commas glued to a word.
 */
function preprocessContent(content: string): string {
  if (!content) {
    return "";
  }
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, "$$$$\n$1\n$$$$")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$$")
    .replace(/\\\\([a-zA-Z]+|[,;!])/g, "\\$1")
    .replace(/\\n/g, "\n")
    .replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2")
    .replace(/([^\n])\n([-*+] )/g, "$1\n\n$2")
    .replace(/([^\n])\n(\d+\. )/g, "$1\n\n$2")
    .replace(/,(?=[a-zA-Z])/g, ", ");
}

/**
 * Rewrite every known node `@slug` mention (e.g. `@text_run`) into a Markdown
 * link with the {@link NODE_DOC_SCHEME} scheme, so the renderer can turn it into
 * a button that opens that node's docs. Only resolvable slugs are linked;
 * unknown `@words` are left untouched. Code spans and fenced code blocks are
 * skipped so slugs in code samples render verbatim.
 *
 * @param content - Raw Markdown source.
 */
function linkNodeSlugs(content: string): string {
  // Capture group keeps the code regions in the split; odd indices are code.
  return content
    .split(/(```[\s\S]*?```|`[^`]*`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/@([a-zA-Z][\w]*)/g, (match, name) => {
            const type = nodeTypeForSlug(`@${name}`);
            return type ? `[@${name}](${NODE_DOC_HREF}${type})` : match;
          }),
    )
    .join("");
}

/** rehype-sanitize schema widened to allow KaTeX's MathML + class/style output. */
const katexSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "span",
    "div",
    "math",
    "semantics",
    "annotation",
    "mrow",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "mspace",
    "msqrt",
    "mroot",
    "mfrac",
    "msub",
    "msup",
    "msubsup",
    "munder",
    "mover",
    "munderover",
    "mtable",
    "mtr",
    "mtd",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": ["className", "style"],
    span: ["aria-hidden"],
    math: ["xmlns", "display"],
    annotation: ["encoding"],
  },
};

/**
 * Render `content` as sanitized Markdown (GFM + math + code highlighting),
 * pre-processing LaTeX delimiters and loose line breaks first. The renderer
 * only — callers wrap it in a `prose` container to control typography. Shared
 * by the Markdown input node, AI Markdown output (PreviewPane), and the
 * Builder chat assistant.
 *
 * Wide GFM tables get their own horizontal scroll container so long rows never
 * clip at the container edge (code blocks already scroll via prose `pre`).
 *
 * When `onNodeClick` is supplied, every known node `@slug` in the source becomes
 * a clickable chip that calls it with the node type — used by the Builder chat
 * assistant so users can open a node's docs straight from a reply.
 *
 * @param props.content - Raw Markdown source to render.
 * @param props.onNodeClick - Optional handler for node `@slug` clicks.
 */
export function Markdown({
  content,
  onNodeClick,
}: {
  content: string;
  onNodeClick?: (type: ToolNodeType) => void;
}) {
  const processed = preprocessContent(content);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
      rehypePlugins={[
        rehypeRaw,
        [rehypeSanitize, katexSchema],
        rehypeKatex,
        rehypeHighlight,
      ]}
      components={{
        table: ({ node: _node, ...props }) => (
          <div className="overflow-x-auto overscroll-x-contain">
            <table {...props} />
          </div>
        ),
        a: ({ node: _node, href, children, ...props }) => {
          if (onNodeClick && href?.startsWith(NODE_DOC_HREF)) {
            const type = href.slice(NODE_DOC_HREF.length) as ToolNodeType;
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onNodeClick(type);
                }}
                className="not-prose mx-0.5 inline-flex items-center border border-foreground bg-accent px-1 py-0 align-baseline font-mono text-[0.85em] font-bold text-accent-foreground no-underline transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title={String(children)}
              >
                {children}
              </button>
            );
          }
          return (
            <a href={href} {...props}>
              {children}
            </a>
          );
        },
      }}
    >
      {onNodeClick ? linkNodeSlugs(processed) : processed}
    </ReactMarkdown>
  );
}
