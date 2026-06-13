"use client";

import { useCallback, useEffect, useState } from "react";

import { type MessageKey, MESSAGES } from "@/constants/i18n";
import { useAppConfig } from "@/hooks/useAppConfig";

/**
 * Translate UI strings for the active locale.
 *
 * Reads the current locale from {@link useAppConfig} and returns a memoised
 * `t(key, params?)` resolver. Unknown locales fall back to `en`; a missing key
 * falls back to its English string (and ultimately the raw key) so the UI
 * never renders blank. `params` replaces `{name}` placeholders in the string.
 *
 * On the first render (server + initial client hydration) this resolves
 * against the `en` default so the client output matches the server-rendered
 * HTML and there is no hydration mismatch. After mount it switches to the
 * persisted locale (a one-frame English → target flip, like the theme). The
 * gate is a local `mounted` flag (not the Redux `hydrated` flag) so it is
 * immune to store-hydration / Fast-Refresh timing.
 *
 * @returns `{ t, locale }` — the resolver plus the active (effective) locale.
 */
export function useTranslation() {
  const { locale } = useAppConfig();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const effectiveLocale = mounted ? locale : "en";

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>): string => {
      const table = MESSAGES[effectiveLocale] ?? MESSAGES.en;
      let str = table[key] ?? MESSAGES.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [effectiveLocale],
  );

  return { t, locale: effectiveLocale };
}
