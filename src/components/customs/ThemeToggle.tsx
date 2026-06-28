"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Light/dark theme toggle — an icon button that flips the app between light and
 * dark. Reads/writes the global theme through {@link useAppConfig}; the actual
 * `.dark` class + persistence are handled by `AppConfigProvider`.
 *
 * The resolved appearance accounts for the `"system"` setting by reading the OS
 * `prefers-color-scheme` (and tracking it live). Clicking always commits an
 * explicit `"light"` or `"dark"` so the toggle is deterministic.
 *
 * The icon stays on its server-rendered default (Moon) until the Redux config
 * has hydrated, so the first client render matches SSR — no hydration mismatch.
 *
 * @param props.className - Extra classes for the trigger button.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, hydrated } = useAppConfig();
  const { t } = useTranslation();
  const [systemDark, setSystemDark] = useState(false);

  // Track the OS preference so a `"system"` theme resolves correctly.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemDark);
  // Only diverge from the SSR default after hydration to avoid a mismatch.
  const showSun = hydrated && isDark;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t(showSun ? "theme.switchToLight" : "theme.switchToDark")}
      title={t(showSun ? "theme.switchToLight" : "theme.switchToDark")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      {showSun ? <Sun /> : <Moon />}
    </Button>
  );
}
