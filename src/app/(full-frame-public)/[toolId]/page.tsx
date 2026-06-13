import type { Metadata } from "next";

import { SharedToolView } from "@/features/SharedToolView";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ toolId: string }> };

/**
 * Per-tool SEO for the public share page. Reads only the tool name (never the
 * owning org) from the same shared-read RLS policy used by the page itself, so
 * crawlers and link unfurlers get a descriptive title/description. Unshared or
 * missing tools resolve to a `noindex` "not found" entry.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { toolId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tools")
    .select("name")
    .eq("id", toolId)
    .eq("is_shared", true)
    .single();

  if (!data?.name) {
    return { title: "Tool not found", robots: { index: false, follow: false } };
  }

  const title = data.name;
  const description = `Use “${data.name}” — an interactive tool built with Toolkit Studio.`;
  return {
    title,
    description,
    openGraph: { type: "website", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Public share page — renders the tool preview for anyone with the link. */
export default async function SharedToolPage({ params }: Props) {
  const { toolId } = await params;
  return <SharedToolView toolId={toolId} />;
}
