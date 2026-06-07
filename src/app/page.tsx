import { ToolBuilder } from "@/features/ToolBuilder";

/** Home route — mounts the Tool Builder workspace. */
export default function Home() {
  return (
    <div className="h-dvh">
      <ToolBuilder />
    </div>
  );
}
