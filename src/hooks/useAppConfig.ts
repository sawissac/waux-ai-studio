"use client";

import { useMemo } from "react";

import type { ToggleSettingKey } from "@/constants/settings";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  type AppLocale,
  type AppTheme,
  hydrateConfig,
  type PersistedAppConfig,
  resetConfig,
  setAutoSave,
  setConfirmBeforeDelete,
  setHydrated,
  setLocale,
  setReducedMotion,
  setSidebarCollapsed,
  setTheme,
  toggleSidebar,
} from "@/stores/slices/appConfigSlice";

/**
 * Single access point for global app config / user settings.
 *
 * Components never touch the `appConfig` slice or `useAppSelector` directly
 * (per the feature rules); they read the current config and call the bound
 * action helpers returned here.
 *
 * @returns Current {@link AppConfigState} fields plus bound setters.
 */
export function useAppConfig() {
  const dispatch = useAppDispatch();

  const theme = useAppSelector((s) => s.appConfig.theme);
  const locale = useAppSelector((s) => s.appConfig.locale);
  const sidebarCollapsed = useAppSelector((s) => s.appConfig.sidebarCollapsed);
  const reducedMotion = useAppSelector((s) => s.appConfig.reducedMotion);
  const autoSave = useAppSelector((s) => s.appConfig.autoSave);
  const confirmBeforeDelete = useAppSelector(
    (s) => s.appConfig.confirmBeforeDelete,
  );
  const hydrated = useAppSelector((s) => s.appConfig.hydrated);

  const actions = useMemo(
    () => ({
      setTheme: (v: AppTheme) => dispatch(setTheme(v)),
      setLocale: (v: AppLocale) => dispatch(setLocale(v)),
      toggleSidebar: () => dispatch(toggleSidebar()),
      setSidebarCollapsed: (v: boolean) => dispatch(setSidebarCollapsed(v)),
      setReducedMotion: (v: boolean) => dispatch(setReducedMotion(v)),
      setAutoSave: (v: boolean) => dispatch(setAutoSave(v)),
      setConfirmBeforeDelete: (v: boolean) =>
        dispatch(setConfirmBeforeDelete(v)),
      /** Set any boolean (toggle) setting by its catalog key. */
      setToggle: (key: ToggleSettingKey, v: boolean) => {
        switch (key) {
          case "reducedMotion":
            return dispatch(setReducedMotion(v));
          case "autoSave":
            return dispatch(setAutoSave(v));
          case "confirmBeforeDelete":
            return dispatch(setConfirmBeforeDelete(v));
          case "sidebarCollapsed":
            return dispatch(setSidebarCollapsed(v));
        }
      },
      hydrateConfig: (v: Partial<PersistedAppConfig>) =>
        dispatch(hydrateConfig(v)),
      resetConfig: () => dispatch(resetConfig()),
      setHydrated: (v: boolean) => dispatch(setHydrated(v)),
    }),
    [dispatch],
  );

  /** Map of toggle keys to current boolean value (for catalog-driven UI). */
  const toggles: Record<ToggleSettingKey, boolean> = {
    reducedMotion,
    autoSave,
    confirmBeforeDelete,
    sidebarCollapsed,
  };

  return {
    theme,
    locale,
    sidebarCollapsed,
    reducedMotion,
    autoSave,
    confirmBeforeDelete,
    hydrated,
    toggles,
    ...actions,
  };
}
