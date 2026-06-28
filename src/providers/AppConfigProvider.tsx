"use client";

import { type ReactNode, useEffect, useRef } from "react";

import {
  LEGACY_SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from "@/constants/settings";
import { useAppConfig } from "@/hooks/useAppConfig";
import type { PersistedAppConfig } from "@/stores/slices/appConfigSlice";

/**
 * Read and validate the persisted settings blob from localStorage.
 * Returns a partial config so older/newer shapes degrade gracefully.
 */
function readStoredConfig(): Partial<PersistedAppConfig> | null {
  try {
    let raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      // One-time migration from the pre-rebrand key, so existing users keep
      // their saved settings: copy the blob onto the new key and drop the old.
      const legacy = window.localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      if (legacy) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, legacy);
        window.localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
        raw = legacy;
      }
    }
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Resolve whether the dark theme should be active for the given preference. */
function isDark(theme: PersistedAppConfig["theme"]): boolean {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

/**
 * Applies and persists global app config (user settings).
 *
 * Responsibilities (client-only):
 * - Hydrate the Redux `appConfig` slice from localStorage once on mount.
 * - Reflect the active theme onto `<html>` (`.dark` class + `color-scheme`),
 *   tracking the OS preference live while theme is `system`.
 * - Reflect reduced-motion onto `<html>` via `data-reduced-motion`.
 * - Mirror persisted settings back to localStorage on every change.
 *
 * Compose inside `StoreProvider` in `src/app/layout.tsx`. Renders children
 * unchanged — it has no markup of its own.
 *
 * @param props.children - App subtree.
 */
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const {
    theme,
    locale,
    sidebarCollapsed,
    reducedMotion,
    autoSave,
    confirmBeforeDelete,
    hydrated,
    hydrateConfig,
    setHydrated,
  } = useAppConfig();

  // Hydrate from localStorage once, before paint, then mark hydrated.
  const didHydrate = useRef(false);
  useEffect(() => {
    if (didHydrate.current) {
      return;
    }
    didHydrate.current = true;
    const stored = readStoredConfig();
    if (stored) {
      hydrateConfig(stored);
    }
    setHydrated(true);
  }, [hydrateConfig, setHydrated]);

  // Reflect theme onto <html>; track OS changes while "system".
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = isDark(theme);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };
    apply();

    if (theme !== "system") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  // Reflect reduced-motion onto <html>.
  useEffect(() => {
    document.documentElement.toggleAttribute(
      "data-reduced-motion",
      reducedMotion,
    );
  }, [reducedMotion]);

  // Reflect locale onto <html lang>.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Persist settings after hydration (skip the initial pre-hydration render).
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const payload: PersistedAppConfig = {
      theme,
      locale,
      sidebarCollapsed,
      reducedMotion,
      autoSave,
      confirmBeforeDelete,
    };
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      // Storage unavailable (private mode / quota) — settings stay in-memory.
    }
  }, [
    hydrated,
    theme,
    locale,
    sidebarCollapsed,
    reducedMotion,
    autoSave,
    confirmBeforeDelete,
  ]);

  return <>{children}</>;
}
