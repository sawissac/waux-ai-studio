import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Color theme preference for the app shell. */
export type AppTheme = "light" | "dark" | "system";

/** Supported UI locale (BCP-47 tag). */
export type AppLocale = "en" | "my";

/**
 * Global, app-wide configuration state.
 *
 * Holds cross-cutting UI/runtime preferences that many features read but no
 * single feature owns (theme, locale, primary sidebar state, behaviour
 * toggles, hydration flag). These are the **available settings** surfaced by
 * the `Settings` feature.
 *
 * SECURITY: never store the organization id (or any server-only identifier)
 * here — this slice is serialized to the client and mirrored to localStorage.
 * Scope access by slug instead.
 */
export interface AppConfigState {
  /** Active color theme. */
  theme: AppTheme;
  /** Active UI locale. */
  locale: AppLocale;
  /** Whether the primary navigation sidebar is collapsed. */
  sidebarCollapsed: boolean;
  /** Minimise non-essential motion/animation across the app. */
  reducedMotion: boolean;
  /** Persist tool changes to Supabase automatically (no manual Save). */
  autoSave: boolean;
  /** Ask for confirmation before destructive actions (delete tool/node). */
  confirmBeforeDelete: boolean;
  /** Set once the client store has hydrated; gate client-only UI on this. */
  hydrated: boolean;
}

/**
 * Subset of {@link AppConfigState} that is user-persisted (mirrored to
 * localStorage). Excludes transient/runtime flags like {@link AppConfigState.hydrated}.
 */
export type PersistedAppConfig = Omit<AppConfigState, "hydrated">;

export const initialAppConfig: AppConfigState = {
  theme: "light",
  locale: "en",
  sidebarCollapsed: false,
  reducedMotion: false,
  autoSave: false,
  confirmBeforeDelete: true,
  hydrated: false,
};

/**
 * `appConfig` slice — global app configuration / user settings.
 *
 * Mounted at `state.appConfig`. Never read directly from components — go
 * through the `@/hooks/useAppConfig` access hook (per the feature rules).
 */
const appConfigSlice = createSlice({
  name: "appConfig",
  initialState: initialAppConfig,
  reducers: {
    /** Set the active color theme. */
    setTheme(state, action: PayloadAction<AppTheme>) {
      state.theme = action.payload;
    },
    /** Set the active locale. */
    setLocale(state, action: PayloadAction<AppLocale>) {
      state.locale = action.payload;
    },
    /** Toggle the primary sidebar collapsed/expanded. */
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    /** Explicitly set the primary sidebar collapsed state. */
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    /** Toggle reduced-motion preference. */
    setReducedMotion(state, action: PayloadAction<boolean>) {
      state.reducedMotion = action.payload;
    },
    /** Toggle automatic save of tool changes. */
    setAutoSave(state, action: PayloadAction<boolean>) {
      state.autoSave = action.payload;
    },
    /** Toggle the confirm-before-delete guard. */
    setConfirmBeforeDelete(state, action: PayloadAction<boolean>) {
      state.confirmBeforeDelete = action.payload;
    },
    /**
     * Merge persisted settings (e.g. from localStorage) into state.
     * Partial so a stored config missing newer keys keeps slice defaults.
     */
    hydrateConfig(state, action: PayloadAction<Partial<PersistedAppConfig>>) {
      Object.assign(state, action.payload);
    },
    /** Restore every setting to its default value. */
    resetConfig(state) {
      Object.assign(state, initialAppConfig, { hydrated: state.hydrated });
    },
    /** Mark the client store as hydrated. */
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload;
    },
  },
});

export const {
  setTheme,
  setLocale,
  toggleSidebar,
  setSidebarCollapsed,
  setReducedMotion,
  setAutoSave,
  setConfirmBeforeDelete,
  hydrateConfig,
  resetConfig,
  setHydrated,
} = appConfigSlice.actions;

export const appConfigReducer = appConfigSlice.reducer;
