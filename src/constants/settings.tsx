import {
  Languages,
  type LucideIcon,
  Monitor,
  Moon,
  MousePointerClick,
  Save,
  ShieldAlert,
  Sun,
  Zap,
} from "lucide-react";

import type { MessageKey } from "@/constants/i18n";
import type {
  AppLocale,
  AppTheme,
  PersistedAppConfig,
} from "@/stores/slices/appConfigSlice";

/**
 * Catalog of available settings surfaced by the `Settings` feature.
 *
 * Pure static metadata — no React state, no Redux. Each entry maps a setting
 * in {@link PersistedAppConfig} to its i18n label/description keys, icon, and
 * (for choice settings) the selectable options. Labels are {@link MessageKey}s
 * resolved at render via `@/hooks/useTranslation`. The `Settings` UI renders
 * straight from these arrays so adding a setting is a one-place change.
 */

/** localStorage key the persisted settings are mirrored to. */
export const SETTINGS_STORAGE_KEY = "wauxaistudio:app-config";

/**
 * Pre-rebrand storage key. Read once on hydrate so existing users keep their
 * settings, then renamed to {@link SETTINGS_STORAGE_KEY} (see
 * `AppConfigProvider`). Safe to delete once no active user is on the old key.
 */
export const LEGACY_SETTINGS_STORAGE_KEY = "toolkit:app-config";

/** A selectable option whose label comes from the i18n catalog. */
export interface ChoiceOption<T extends string> {
  value: T;
  labelKey: MessageKey;
  icon?: LucideIcon;
}

/** Theme choices for the appearance setting. */
export const THEME_OPTIONS: ChoiceOption<AppTheme>[] = [
  { value: "light", labelKey: "theme.light", icon: Sun },
  { value: "dark", labelKey: "theme.dark", icon: Moon },
  { value: "system", labelKey: "theme.system", icon: Monitor },
];

/**
 * Locale choices for the language setting. Labels stay as the language's own
 * endonym (shown in its native script) — these are intentionally not translated.
 */
export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "my", label: "မြန်မာ (Burmese)" },
];

/** Keys of {@link PersistedAppConfig} that are boolean (toggle) settings. */
export type ToggleSettingKey = {
  [K in keyof PersistedAppConfig]: PersistedAppConfig[K] extends boolean
    ? K
    : never;
}[keyof PersistedAppConfig];

/** Metadata for one boolean (toggle) setting. */
export interface ToggleSettingMeta {
  key: ToggleSettingKey;
  labelKey: MessageKey;
  descKey: MessageKey;
  icon: LucideIcon;
}

/** Toggle settings, in display order. */
export const TOGGLE_SETTINGS: ToggleSettingMeta[] = [
  {
    key: "reducedMotion",
    labelKey: "settings.reducedMotion",
    descKey: "settings.reducedMotion.desc",
    icon: Zap,
  },
  {
    key: "autoSave",
    labelKey: "settings.autoSave",
    descKey: "settings.autoSave.desc",
    icon: Save,
  },
  {
    key: "confirmBeforeDelete",
    labelKey: "settings.confirmBeforeDelete",
    descKey: "settings.confirmBeforeDelete.desc",
    icon: ShieldAlert,
  },
  {
    key: "sidebarCollapsed",
    labelKey: "settings.sidebarCollapsed",
    descKey: "settings.sidebarCollapsed.desc",
    icon: MousePointerClick,
  },
];

/** Icon for the appearance/theme section header. */
export const APPEARANCE_ICON: LucideIcon = Sun;
/** Icon for the language section header. */
export const LANGUAGE_ICON: LucideIcon = Languages;
