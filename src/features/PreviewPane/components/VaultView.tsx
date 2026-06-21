"use client";

/**
 * Key/value detail view for the Tool Builder's Vault node (preview-only).
 *
 * Renders the node's author-defined {@link VaultEntry} pairs as a read-only
 * property sheet — one `key → value` row each. When the node's `masked` flag is
 * on, every value is hidden behind dots with a single reveal toggle (handy for
 * tokens / secrets). The component never writes to state; the runtime assembles
 * the same entries into a `{ [key]: value }` object on the bound slot for
 * downstream nodes.
 */
import { Eye, EyeOff, Vault } from "lucide-react";
import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import type { VaultNode } from "@/types/tool-builder";

/** A masked stand-in for a value, length-capped so long secrets stay tidy. */
const MASK = "••••••••";

/**
 * Render a Vault node's key/value pairs as a detail view.
 *
 * @param props.node - The Vault node config (entries + masking).
 */
export function VaultView({ node }: { node: VaultNode }): React.ReactElement {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  // Only entries with a non-empty key make it into the stored object — mirror
  // that here so the detail view matches what downstream nodes receive.
  const entries = node.entries.filter((e) => e.key.trim());

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 px-4 py-6 text-center text-xs text-muted-foreground">
        {t("vault.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {node.masked && (
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="inline-flex w-fit items-center gap-1.5 self-end rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-95"
        >
          {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
          {revealed ? t("vault.hide") : t("vault.reveal")}
        </button>
      )}
      <dl className="flex flex-col gap-px border-2 border-foreground bg-foreground shadow-nb">
        {entries.map((e) => {
          const hidden = node.masked && !revealed;
          return (
            <div
              key={e.id}
              className="flex items-baseline justify-between gap-3 bg-card px-3 py-2 leading-tight"
            >
              <dt className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Vault size={12} className="opacity-50" />
                {e.key}
              </dt>
              <dd className="min-w-0 break-all text-right font-mono text-sm">
                {hidden ? (
                  <span className="tracking-widest text-muted-foreground">
                    {MASK}
                  </span>
                ) : (
                  e.value || <span className="text-muted-foreground/60">—</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
