"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Topbar action that toggles browser fullscreen for the whole app.
 *
 * Uses the native Fullscreen API on `document.documentElement`, so the entire
 * page (every panel) fills the screen. The button mirrors the real fullscreen
 * state via the `fullscreenchange` event, staying correct even when the user
 * exits with the Esc key or browser chrome rather than this button.
 */
export function FullscreenButton() {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /** Enter fullscreen on the document root, or exit if already fullscreen. */
  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  const label = isFullscreen
    ? t("topbar.exitFullscreen")
    : t("topbar.fullscreen");

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      aria-pressed={isFullscreen}
      title={label}
      onClick={toggle}
      className="size-7"
    >
      {isFullscreen ? (
        <Minimize className="size-4" />
      ) : (
        <Maximize className="size-4" />
      )}
    </Button>
  );
}
