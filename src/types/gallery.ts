/**
 * Domain types for the Gallery feature.
 *
 * A {@link Gallery} is a user's public showcase page (one per user, addressed
 * by its public {@link Gallery.handle}). It lists the owner's tools that are
 * both {@link GalleryTool.inGallery | in the gallery} and
 * {@link GalleryTool.isShared | publicly shared}, but only while the gallery
 * itself {@link Gallery.isPublic | is published}.
 *
 * SECURITY: nothing here carries the owner's user id (or any server-only id).
 * The public surface keys off the handle; the owner reads their own row under
 * RLS. The owner id is resolved server-side and never serialised to a client.
 */

/** A user's gallery settings (owner-facing). */
export interface Gallery {
  /** Public URL handle (`/g/<handle>`), or `null` until claimed. */
  handle: string | null;
  /** Display heading for the public page. */
  title: string;
  /** Short blurb shown under the title. */
  description: string;
  /** Whether the gallery page is reachable by the public. */
  isPublic: boolean;
}

/**
 * One of the owner's tools as seen by the Gallery manager: identity plus the
 * two persisted flags that decide whether it shows on the public page.
 */
export interface GalleryTool {
  id: string;
  name: string;
  /** Sanitised SVG markup, or undefined for the default glyph. */
  icon?: string;
  /** Added to the gallery (membership). */
  inGallery: boolean;
  /** Publicly readable (reuses the tool's existing share flag). */
  isShared: boolean;
}

/**
 * A tool card on the public gallery page. Carries only the public tool id
 * (already a public share key via `/<toolId>`), its name, and its icon —
 * never the owner id or any membership flag.
 */
export interface GalleryToolCard {
  id: string;
  name: string;
  icon?: string;
}

/** The public payload returned by `GET /api/gallery/[handle]`. */
export interface PublicGallery {
  title: string;
  description: string;
  tools: GalleryToolCard[];
}
