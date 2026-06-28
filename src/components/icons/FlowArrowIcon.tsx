import type { SVGProps } from "react";

/**
 * Decorative "dot · dot · dot → arrow" connector used between the How-it-works
 * step cards. Three dots fading up in `currentColor`, then a sleek rounded
 * arrowhead — reads as data flowing from one step to the next. Colour comes
 * from `currentColor` (set a `text-*` class on the caller); the parent rotates
 * it 90° to point downward on stacked layouts.
 *
 * @param props - Standard SVG props (e.g. `className`, `aria-hidden`).
 */
export function FlowArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {/* three dots, fading up */}
      <circle cx="6" cy="12" r="2.8" fill="currentColor" fillOpacity="0.35" />
      <circle cx="19" cy="12" r="2.8" fill="currentColor" fillOpacity="0.6" />
      <circle cx="32" cy="12" r="2.8" fill="currentColor" fillOpacity="0.85" />
      {/* arrowhead */}
      <path
        d="M46 5.5L57 12L46 18.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
