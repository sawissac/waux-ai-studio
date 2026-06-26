"use client";

/**
 * Preview renderer for the Tool Builder's Identity node.
 *
 * Generates the node's fake-data records (deterministically, from its
 * template + count + seed) and shows them as a read-only JSON sample with a
 * record-count badge. The runtime writes the identical array to the bound state
 * slot for downstream nodes; this view is purely a live preview of that output.
 */
import { Fingerprint } from "lucide-react";
import { useMemo } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { generateIdentities } from "@/lib/generate-identity";
import type { IdentityNode } from "@/types/tool-builder";

/** How many records to show in the preview before collapsing the rest. */
const PREVIEW_LIMIT = 25;

/**
 * Render an Identity node's generated records.
 *
 * @param props.node - The Identity node config (template, count, seed).
 */
export function IdentityView({
  node,
}: {
  node: IdentityNode;
}): React.ReactElement {
  const { t } = useTranslation();

  // Recompute only when the inputs that affect generation change.
  const records = useMemo(
    () => generateIdentities(node),
    [node.template, node.count, node.seed],
  );

  // Distinguish "nothing requested" from "template didn't parse" for the hint.
  const templateValid = useMemo(() => {
    try {
      JSON.parse(node.template);
      return true;
    } catch {
      return false;
    }
  }, [node.template]);

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 px-4 py-6 text-center text-xs text-muted-foreground">
        {!templateValid ? t("identity.invalidTemplate") : t("identity.empty")}
      </div>
    );
  }

  const shown = records.slice(0, PREVIEW_LIMIT);
  const hidden = records.length - shown.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 border-2 border-foreground bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-nb-sm">
          <Fingerprint size={12} className="opacity-60" />
          {t("identity.recordCount", { n: records.length })}
        </span>
      </div>
      <pre className="max-h-80 overflow-auto border-2 border-foreground bg-card p-3 font-mono text-xs leading-relaxed shadow-nb">
        {JSON.stringify(shown, null, 2)}
      </pre>
      {hidden > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {t("identity.more", { n: hidden })}
        </p>
      )}
    </div>
  );
}
