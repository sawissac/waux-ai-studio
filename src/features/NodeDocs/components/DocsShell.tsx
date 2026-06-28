"use client";

import { ArrowLeft, BookText } from "lucide-react";
import Link from "next/link";

import { useTranslation } from "@/hooks/useTranslation";

/**
 * Chrome for the `/docs/**` section: a sticky neobrutalism topbar (brand +
 * back-to-Studio link) above a centred `prose` column that styles authored
 * MDX. Mounted by `src/app/docs/layout.tsx`; `children` is the rendered MDX.
 *
 * All user-facing copy resolves through `t()` so the docs shell is bilingual
 * like the rest of the app. "WauxAiStudio" is a brand name and stays as-is.
 */
export function DocsShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b-2 border-foreground bg-background px-4">
        <div className="flex items-center gap-2 font-semibold">
          <BookText size={16} />
          <span className="font-poppins">WauxAiStudio</span>
          <span className="text-muted-foreground">/ {t("docs.title")}</span>
        </div>
        <Link
          href="/studio"
          className="nb-press flex items-center gap-1.5 border-2 border-foreground bg-card px-2.5 py-1 text-sm font-semibold shadow-nb-sm"
        >
          <ArrowLeft size={14} />
          {t("docs.backToStudio")}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-poppins prose-a:text-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
