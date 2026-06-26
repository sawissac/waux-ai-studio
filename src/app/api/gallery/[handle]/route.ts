import { isValidHandle } from "@/lib/gallery";
import { createClient } from "@/lib/supabase/server";
import type { GalleryToolCard, PublicGallery } from "@/types/gallery";

/**
 * GET /api/gallery/[handle]
 *
 * Public endpoint — returns a published gallery and its visible tool cards.
 *
 * RLS does the gatekeeping with the anon key:
 *   • `galleries_public_read` returns the gallery row only when `is_public`.
 *   • `tools_public_shared_read` returns tools only when `is_shared`.
 * A missing / unpublished gallery (or a malformed handle) resolves to 404.
 *
 * SECURITY: the owner's user id is resolved server-side to scope the tool query
 * and is NEVER included in the response. Only the public tool id (already a
 * public share key via `/<toolId>`), name, and icon are returned.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;

  if (!isValidHandle(handle)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data: gallery, error } = await supabase
    .from("galleries")
    .select("owner_id, title, description")
    .eq("handle", handle)
    .eq("is_public", true)
    .single();

  if (error || !gallery) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Scope tools to this owner + gallery membership + public visibility. Every
  // returned row has is_shared = true, so the public-read RLS policy permits it.
  const { data: toolRows, error: toolError } = await supabase
    .from("tools")
    .select("id, name, icon, position")
    .eq("owner_id", gallery.owner_id)
    .eq("in_gallery", true)
    .eq("is_shared", true)
    .order("position");

  if (toolError) {
    return Response.json({ error: "Failed to load gallery" }, { status: 500 });
  }

  const tools: GalleryToolCard[] = (toolRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon ?? undefined,
  }));

  const payload: PublicGallery = {
    title: gallery.title ?? "",
    description: gallery.description ?? "",
    tools,
  };

  return Response.json(payload);
}
