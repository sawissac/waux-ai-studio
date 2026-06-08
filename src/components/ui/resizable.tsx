"use client";

import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

/**
 * shadcn-style wrappers over `react-resizable-panels` (v4: Group / Panel /
 * Separator). `ResizableHandle` renders a thin draggable rule with a centered
 * grip that highlights on hover/drag.
 */
function ResizableGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-group"
      className={cn(
        "flex h-full w-full data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const ResizablePanel = Panel;

function ResizableHandle({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-px shrink-0 items-center justify-center bg-border outline-none",
        "transition-colors duration-[var(--motion-duration-fast)]",
        "hover:bg-ring/60 data-[active]:bg-ring focus-visible:bg-ring",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
        className,
      )}
      {...props}
    />
  );
}

export { ResizableGroup, ResizableHandle, ResizablePanel };
