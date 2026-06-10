import type { SVGProps } from "react";

/**
 * Toolkits brand mark — a neubrutalist "T" assembled from two blocks:
 * a signal-yellow crossbar resting on an electric-blue stem. The two-piece
 * construction mirrors the product idea of composing tools from parts.
 *
 * Follows the design-system primitives (see design-system/toolkits/MASTER.md):
 * hard 3px outlines, flat saturated fills, zero-blur offset shadows, sharp
 * corners. Colors are driven by CSS variables so the mark adapts to dark mode
 * (light outlines, black shadow) like every other surface in the app.
 *
 * Standalone copies with baked-in colors live at `public/logo.svg` (asset)
 * and `src/app/icon.svg` (favicon).
 *
 * @param props.size - Rendered width/height in pixels. Defaults to 24.
 * @param props.title - Accessible name. Omit when the mark sits next to
 *   visible brand text; the SVG is then hidden from assistive tech.
 */
export function Logo({
  size = 24,
  title,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {/* stem: hard offset shadow, then block */}
      <rect
        x="28"
        y="23"
        width="14"
        height="34"
        fill="var(--nb-shadow-color)"
      />
      <rect
        x="25"
        y="20"
        width="14"
        height="34"
        fill="var(--chart-3)"
        stroke="var(--foreground)"
        strokeWidth="3"
      />
      {/* crossbar: hard offset shadow, then block */}
      <rect
        x="12"
        y="12"
        width="46"
        height="15"
        fill="var(--nb-shadow-color)"
      />
      <rect
        x="9"
        y="9"
        width="46"
        height="15"
        fill="var(--primary)"
        stroke="var(--foreground)"
        strokeWidth="3"
      />
    </svg>
  );
}
