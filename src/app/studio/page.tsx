import { ToolBuilder } from "@/features/ToolBuilder";

/** Studio route — mounts the Toolkit Studio workspace (the node-chain editor). */
export default function StudioPage() {
  return (
    <div className="h-dvh">
      <ToolBuilder />
    </div>
  );
}
