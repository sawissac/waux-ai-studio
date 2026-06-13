"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getNodeDetail } from "@/constants/node-docs";
import { ACCENT_CLASSES, NODE_META } from "@/constants/tool-builder";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { ToolNodeType } from "@/types/tool-builder";

/** A titled block inside the detail dialog. Hidden when it has no content. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Full reference for one node type, in a modal dialog. Opened by clicking a
 * card in {@link NodeDocs}. Detail content comes from `@/constants/node-docs`
 * (`getNodeDetail`) — the same serialisable data an AI tool call consumes — so
 * the docs and the model see the same facts. Chrome (section headings) is
 * localized via `t()`; the long-form body is the English content layer.
 *
 * @param props.type - Node type to show, or `null` to close.
 * @param props.onClose - Called when the dialog is dismissed.
 */
export function NodeDetailDialog({
  type,
  onClose,
}: {
  type: ToolNodeType | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={type !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      {type !== null &&
        (() => {
          const meta = NODE_META[type];
          const Icon = meta.icon;
          const detail = getNodeDetail(type);
          return (
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center border-2 border-foreground",
                      ACCENT_CLASSES[meta.accent],
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="font-poppins">
                      {t(`node.${type}.label`)}
                    </DialogTitle>
                    <code className="font-mono text-xs text-muted-foreground">
                      {meta.slug}
                    </code>
                  </div>
                </div>
                {meta.blurb && (
                  <DialogDescription className="text-left">
                    {t(`node.${type}.blurb`)}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="flex flex-col gap-5 text-sm">
                <Section title={t("docs.detail.summary")}>
                  <p className="leading-relaxed text-muted-foreground">
                    {detail.summary}
                  </p>
                </Section>

                <Section title={t("docs.detail.whenToUse")}>
                  <p className="leading-relaxed text-muted-foreground">
                    {detail.whenToUse}
                  </p>
                </Section>

                {detail.config.length > 0 && (
                  <Section title={t("docs.detail.config")}>
                    <ul className="flex flex-col gap-2">
                      {detail.config.map((field) => (
                        <li
                          key={field.name}
                          className="border-2 border-foreground bg-card p-2.5"
                        >
                          <div className="font-semibold">{field.name}</div>
                          <p className="text-[13px] leading-snug text-muted-foreground">
                            {field.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {(detail.io.reads || detail.io.writes) && (
                  <Section title={t("docs.detail.io")}>
                    <dl className="flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        <dt className="w-14 shrink-0 font-semibold">
                          {t("docs.detail.reads")}
                        </dt>
                        <dd className="text-muted-foreground">
                          {detail.io.reads ?? t("docs.detail.none")}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-14 shrink-0 font-semibold">
                          {t("docs.detail.writes")}
                        </dt>
                        <dd className="text-muted-foreground">
                          {detail.io.writes ?? t("docs.detail.none")}
                        </dd>
                      </div>
                    </dl>
                  </Section>
                )}

                {detail.tips.length > 0 && (
                  <Section title={t("docs.detail.tips")}>
                    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
                      {detail.tips.map((tip, i) => (
                        <li key={i} className="leading-snug">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {detail.example && (
                  <Section title={t("docs.detail.example")}>
                    <p className="border-2 border-foreground bg-card p-2.5 leading-relaxed text-muted-foreground">
                      {detail.example}
                    </p>
                  </Section>
                )}
              </div>
            </DialogContent>
          );
        })()}
    </Dialog>
  );
}
