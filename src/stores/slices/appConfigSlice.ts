import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Color theme preference for the app shell. */
export type AppTheme = "light" | "dark" | "system";

/**
 * Global, app-wide configuration state.
 *
 * Holds cross-cutting UI/runtime preferences that many features read but no
 * single feature owns (theme, locale, primary sidebar state, hydration flag).
 *
 * SECURITY: never store the organization id (or any server-only identifier)
 * here — this slice is serialized to the client. Scope access by slug instead.
 */
export interface AppConfigState {
  /** Active color theme. */
  theme: AppTheme;
  /** BCP-47 locale tag, e.g. `en`, `my`. */
  locale: string;
  /** Whether the primary navigation sidebar is collapsed. */
  sidebarCollapsed: boolean;
  /** Set once the client store has hydrated; gate client-only UI on this. */
  hydrated: boolean;
}

const initialState: AppConfigState = {
  theme: "system",
  locale: "en",
  sidebarCollapsed: false,
  hydrated: false,
};

/**
 * `appConfig` slice — global app configuration.
 *
 * Mounted at `state.appConfig`. Use the typed hooks in `@/stores/hooks`.
 */
const appConfigSlice = createSlice({
  name: "appConfig",
  initialState,
  reducers: {
    /** Set the active color theme. */
    setTheme(state, action: PayloadAction<AppTheme>) {
      state.theme = action.payload;
    },
    /** Set the active locale (BCP-47 tag). */
    setLocale(state, action: PayloadAction<string>) {
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
  setHydrated,
} = appConfigSlice.actions;

export const appConfigReducer = appConfigSlice.reducer;
