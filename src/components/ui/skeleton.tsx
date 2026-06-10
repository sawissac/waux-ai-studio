import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder block shown while content loads.
 *
 * Defaults to the neobrutalist look (hard border + offset shadow) to match the
 * builder surfaces. Pass `soft` for the rounded card aesthetic used by the
 * auth pages, or override entirely via `className`.
 *
 * @param props.soft - Use rounded/borderless styling instead of the hard block.
 */
function Skeleton({
  className,
  soft = false,
  ...props
}: React.ComponentProps<"div"> & { soft?: boolean }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "animate-pulse bg-muted",
        soft ? "rounded-md" : "border-2 border-foreground/15",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
