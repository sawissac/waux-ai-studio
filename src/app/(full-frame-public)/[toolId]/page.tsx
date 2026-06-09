import { SharedToolView } from "@/features/SharedToolView";

/** Public share page — renders the tool preview for anyone with the link. */
export default async function SharedToolPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  return <SharedToolView toolId={toolId} />;
}
