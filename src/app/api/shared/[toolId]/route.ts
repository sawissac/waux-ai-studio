import { createClient } from "@/lib/supabase/server";
import type { Tool, ToolNode } from "@/types/tool-builder";

/**
 * GET /api/shared/[toolId]
 *
 * Public endpoint — returns a tool and its nodes when `is_shared` is true.
 * The anon-key RLS policy `tools_public_shared_read` allows unauthenticated
 * reads; any tool that is not shared (or does not exist) resolves to 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> },
) {
  const { toolId } = await params;
  const supabase = await createClient();

  const { data: toolRow, error } = await supabase
    .from("tools")
    .select("id, name")
    .eq("id", toolId)
    .eq("is_shared", true)
    .single();

  if (error || !toolRow) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data: nodeRows, error: nodeError } = await supabase
    .from("tool_nodes")
    .select("id, position, type, config")
    .eq("tool_id", toolId)
    .order("position");

  if (nodeError) {
    return Response.json({ error: "Failed to load nodes" }, { status: 500 });
  }

  const tool: Tool = {
    id: toolRow.id,
    name: toolRow.name,
    nodes: (nodeRows ?? []).map(
      (n) => ({ id: n.id, type: n.type, ...n.config }) as ToolNode,
    ),
  };

  return Response.json(tool);
}
