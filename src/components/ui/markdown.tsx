"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

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
 * @param props.content - Raw Markdown source to render.
 */
export function Markdown({ content }: { content: string }) {
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
      }}
    >
      {preprocessContent(content)}
    </ReactMarkdown>
  );
}
