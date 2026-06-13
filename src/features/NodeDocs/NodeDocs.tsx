"use client";

import { useEffect, useMemo, useState } from "react";

import { ACCENT_CLASSES, NODE_META } from "@/constants/tool-builder";
import { useTranslation } from "@/hooks/useTranslation";
import { getNodeCatalog } from "@/lib/node-catalog";
import { cn } from "@/lib/utils";
import type { ToolNodeType } from "@/types/tool-builder";

import { NodeDetailDialog } from "./components/NodeDetailDialog";

/**
 * Build a stable anchor id for a node type, e.g. `node-http_request`.
 * Lets docs link straight to a node card (`/docs/nodes#node-http_request`),
 * which also opens that node's detail dialog on load.
 */
export const nodeAnchorId = (type: string): string => `node-${type}`;

/** Parse a `#node-<type>` hash into a known node type, else `null`. */
function typeFromHash(hash: string): ToolNodeType | null {
  const match = hash.match(/^#node-(.+)$/);
  const type = match?.[1] as ToolNodeType | undefined;
  return type && type in NODE_META ? type : null;
}

/**
 * Reference catalogue of every node type, grouped exactly like the in-app Node
 * panel. Reads the shared, serialisable catalogue from {@link getNodeCatalog}
 * and renders localized labels/blurbs via `t()`, so it stays in lockstep with
 * the builder and never hardcodes user-facing copy.
 *
 * Each card is a button that opens {@link NodeDetailDialog} with the node's full
 * reference. Selection is mirrored to the URL hash (`#node-<type>`) so a detail
 * view is deep-linkable and the existing anchor still resolves.
 *
 * Mounted by the MDX docs page (`src/app/docs/nodes/page.mdx`). `not-prose`
 * keeps it out of the docs layout's typography styling.
 */
export function NodeDocs() {
  const { t } = useTranslation();
  const groups = useMemo(() => getNodeCatalog(), []);
  const [selected, setSelected] = useState<ToolNodeType | null>(null);

  // Open the dialog from a deep-link hash on first mount.
  useEffect(() => {
    setSelected(typeFromHash(window.location.hash));
  }, []);

  const open = (type: ToolNodeType) => {
    setSelected(type);
    history.replaceState(null, "", `#${nodeAnchorId(type)}`);
  };

  const close = () => {
    setSelected(null);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  return (
    <div className="not-prose flex flex-col gap-10">
      <p className="text-sm text-muted-foreground">{t("docs.cardHint")}</p>

      {groups.map(({ group, groupKey, nodes }) => (
        <section key={group} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2
              id={`group-${group.replace(/\s+/g, "-").toLowerCase()}`}
              className="font-poppins text-lg font-bold"
            >
              {t(groupKey)}
            </h2>
            <span className="border-2 border-foreground bg-card px-1.5 text-xs font-semibold">
              {nodes.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map(
              ({ type, slug, accent, labelKey, blurbKey, hasBlurb }) => {
                const Icon = NODE_META[type].icon;
                return (
                  <button
                    key={type}
                    id={nodeAnchorId(type)}
                    type="button"
                    onClick={() => open(type)}
                    className="nb-press flex scroll-mt-20 flex-col gap-2 border-2 border-foreground bg-card p-3 text-left shadow-nb-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center border-2 border-foreground",
                          ACCENT_CLASSES[accent],
                        )}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {t(labelKey)}
                        </div>
                        <code className="font-mono text-[11px] text-muted-foreground">
                          {slug}
                        </code>
                      </div>
                    </div>
                    {hasBlurb && (
                      <p className="text-[13px] leading-snug text-muted-foreground">
                        {t(blurbKey)}
                      </p>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </section>
      ))}

      <NodeDetailDialog type={selected} onClose={close} />
    </div>
  );
}
