"use client";

import { Package } from "lucide-react";
import { useMemo } from "react";

import { sanitizeSvgIcon } from "@/lib/html-sanitize";
import { cn } from "@/lib/utils";

/**
 * Render a tool's icon.
 *
 * The SVG is re-sanitised on every render (`sanitizeSvgIcon`) before it is
 * injected, so untrusted markup — hand-pasted or AI-generated — can never carry
 * scripts or URL-bearing attributes. When there is no usable SVG, a neutral
 * {@link Package} glyph is shown instead. Size and colour come from the wrapper:
 * the inner `<svg>` is stretched to fill and inherits `currentColor`.
 *
 * Shared by the tools sidebar (`ToolsPanel`), the gallery manager (`Gallery`),
 * and the public gallery (`PublicGallery`).
 *
 * @param props.svg - Raw SVG markup, or undefined for the fallback glyph.
 * @param props.className - Sizing/colour classes for the square wrapper.
 */
export function ToolIcon({
  svg,
  className,
}: {
  svg?: string;
  className?: string;
}) {
  const clean = useMemo(() => sanitizeSvgIcon(svg ?? ""), [svg]);

  if (clean) {
    return (
      <span
        aria-hidden
        className={cn(
          "grid place-items-center [&>svg]:size-full [&>svg]:object-contain",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return (
    <span aria-hidden className={cn("grid place-items-center", className)}>
      <Package className="size-full" strokeWidth={2} />
    </span>
  );
}
