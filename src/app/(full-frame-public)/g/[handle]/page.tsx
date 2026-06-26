import type { Metadata } from "next";

import { PublicGallery } from "@/features/PublicGallery";
import { isValidHandle } from "@/lib/gallery";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ handle: string }> };

/**
 * SEO for the public gallery page. Reads only the gallery's title/description
 * (never the owner) from the same public-read RLS policy the page uses, so
 * crawlers and link unfurlers get a descriptive entry. Unpublished or missing
 * galleries (and malformed handles) resolve to a `noindex` "not found".
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  if (!isValidHandle(handle)) {
    return {
      title: "Gallery not found",
      robots: { index: false, follow: false },
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("galleries")
    .select("title, description")
    .eq("handle", handle)
    .eq("is_public", true)
    .single();

  if (!data) {
    return {
      title: "Gallery not found",
      robots: { index: false, follow: false },
    };
  }

  const title = data.title?.trim() || `@${handle}`;
  const description =
    data.description?.trim() ||
    `Interactive tools by @${handle} — built with Toolkit Studio.`;
  return {
    title,
    description,
    openGraph: { type: "profile", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Public gallery page — a card grid of one user's published tools. */
export default async function PublicGalleryPage({ params }: Props) {
  const { handle } = await params;
  return <PublicGallery handle={handle} />;
}
