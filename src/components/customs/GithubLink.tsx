"use client";

import Link from "next/link";

import { GithubIcon } from "@/components/icons/GithubIcon";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

/** Public source repository for the project. */
const GITHUB_URL = "https://github.com/sawissac/waux-ai-studio";

/**
 * Icon button linking to the project's GitHub repository. Opens in a new tab.
 * Client component only so its accessible name can be localized through
 * {@link useTranslation}.
 *
 * @param props.className - Extra classes for the trigger button.
 */
export function GithubLink({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Button asChild variant="ghost" size="icon-sm" className={className}>
      <Link
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("header.github")}
        title={t("header.github")}
      >
        <GithubIcon />
      </Link>
    </Button>
  );
}
