/**
 * Pure helpers for gallery handles. No React, no Redux, no I/O.
 *
 * A handle is the public URL key for a gallery (`/g/<handle>`). It is the only
 * public identifier — the owner's user id is never exposed — so it must be
 * URL-safe, lowercase, and unique. The format mirrors the DB check constraint
 * `galleries_handle_format` in `supabase/migrations/20260625000000_add_gallery.sql`.
 */

/**
 * Valid handle: 3–32 chars, lowercase alphanumerics with internal single
 * hyphens, starting and ending with an alphanumeric. Keep in lockstep with the
 * DB `galleries_handle_format` constraint.
 */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

/** Max handle length (also enforced by {@link HANDLE_PATTERN}). */
export const HANDLE_MAX_LENGTH = 32;

/**
 * Coerce free-form input toward a valid handle: lowercase, non-alphanumerics
 * collapsed to single hyphens, leading/trailing hyphens trimmed, clamped to
 * {@link HANDLE_MAX_LENGTH}. The result may still be too short — always gate on
 * {@link isValidHandle} before persisting.
 *
 * @param raw - Raw user input (e.g. a display name or typed handle).
 * @returns A normalised candidate handle (possibly empty / too short).
 */
export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HANDLE_MAX_LENGTH);
}

/** Does `handle` satisfy {@link HANDLE_PATTERN}? */
export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}
