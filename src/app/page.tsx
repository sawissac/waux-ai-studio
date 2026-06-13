import { ToolBuilder } from "@/features/ToolBuilder";

/** Home route — mounts the Toolkit Studio workspace. */
export default function Home() {
  return (
    <div className="h-dvh">
      <ToolBuilder />
    </div>
  );
}
