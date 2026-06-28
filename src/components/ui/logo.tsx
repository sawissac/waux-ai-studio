import { type SVGProps, useId } from "react";

/**
 * The WauxAiStudio mark artwork, authored in a 64×64 grid: a dark rounded
 * square holding a white sparkle and a gradient "W". This is the React port of
 * `public/logo.svg` — the single source for both the square {@link Logo} icon
 * and the horizontal {@link LogoLockup}, so every render is identical.
 *
 * The fills are baked (dark square / white / gradient), so unlike the older
 * CSS-variable mark this does NOT recolor for dark mode — it's a self-contained
 * badge that reads on any surface.
 *
 * @param gradientId - Unique id for the "W" linear gradient. Pass a value from
 *   `useId()` so multiple marks on one page don't collide.
 */
function MarkArtwork({
  gradientId,
  mono = false,
}: {
  gradientId: string;
  mono?: boolean;
}) {
  // Monochrome mode (faint hero watermark): drop the dark rounded-square badge
  // and paint the sparkle + "W" in `currentColor`, so the mark reads as a
  // single-tone outline on any surface instead of the baked dark badge with
  // white/gradient fills.
  const sparkleFill = mono ? "currentColor" : "white";
  const wLeftFill = mono ? "currentColor" : `url(#${gradientId})`;
  const wRightFill = mono ? "currentColor" : "white";

  return (
    <>
      {/* dark rounded-square badge (skipped in mono) */}
      {!mono && (
        <g transform="matrix(1.016949,0,0,0.690909,-0.033898,10.927273)">
          <path
            d="M56.058,3C57.369,3 58.626,3.766 59.553,5.13C60.479,6.494 61,8.345 61,10.274C61,20.806 61,40.194 61,50.726C61,52.655 60.479,54.506 59.553,55.87C58.626,57.234 57.369,58 56.058,58C44.94,58 18.06,58 6.942,58C5.631,58 4.374,57.234 3.447,55.87C2.521,54.506 2,52.655 2,50.726C2,40.194 2,20.806 2,10.274C2,8.345 2.521,6.494 3.447,5.13C4.374,3.766 5.631,3 6.942,3C18.06,3 44.94,3 56.058,3Z"
            fill="rgb(20,20,20)"
          />
        </g>
      )}
      <g transform="matrix(1,0,0,1,-2,-1.926224)">
        {/* sparkle */}
        <g transform="matrix(0.450132,0,0,0.450132,45.096026,32.596026)">
          <path
            d="M12.983,21.186C12.895,21.657 12.48,22.002 12,22.002C11.52,22.002 11.105,21.657 11.017,21.186C10.312,16.993 7.007,13.688 2.814,12.983C2.343,12.895 1.998,12.48 1.998,12C1.998,11.52 2.343,11.105 2.814,11.017C7.007,10.312 10.312,7.007 11.017,2.814C11.105,2.343 11.52,1.998 12,1.998C12.48,1.998 12.895,2.343 12.983,2.814C13.688,7.007 16.993,10.312 21.186,11.017C21.657,11.105 22.002,11.52 22.002,12C22.002,12.48 21.657,12.895 21.186,12.983C16.993,13.688 13.688,16.993 12.983,21.186"
            fill={sparkleFill}
            fillRule="nonzero"
          />
        </g>
        {/* the "W" — left stroke + right stroke */}
        <g transform="matrix(1,0,0,0.772727,-6,9.443356)">
          <g transform="matrix(1,0,0,1,4,2)">
            <path
              d="M17.662,34.1C16.842,33.145 16.775,31.507 17.513,30.445C18.252,29.383 19.517,29.297 20.338,30.253L23.595,34.046L30.321,20.594C30.921,19.395 32.16,19.051 33.087,19.827C34.013,20.603 34.279,22.207 33.679,23.406L25.679,39.406C25.361,40.042 24.843,40.466 24.263,40.566C23.682,40.665 23.097,40.431 22.662,39.924L17.662,34.1Z"
              fill={wLeftFill}
            />
          </g>
          <g transform="matrix(1,0,0,1,4,2)">
            <path
              d="M30.321,23.406C29.721,22.207 29.987,20.603 30.913,19.827C31.84,19.051 33.079,19.395 33.679,20.594L39.833,32.902L46.23,17.371C46.749,16.11 47.962,15.632 48.936,16.304C49.91,16.976 50.279,18.545 49.76,19.806L41.765,39.217C41.432,40.027 40.792,40.547 40.085,40.586C39.377,40.625 38.706,40.176 38.321,39.406L30.321,23.406Z"
              fill={wRightFill}
            />
          </g>
        </g>
      </g>
    </>
  );
}

/** The "W" linear gradient definition, keyed by a caller-supplied unique id. */
function MarkDefs({ gradientId }: { gradientId: string }) {
  return (
    <defs>
      <linearGradient
        id={gradientId}
        x1="0"
        y1="0"
        x2="1"
        y2="0"
        gradientUnits="userSpaceOnUse"
        gradientTransform="matrix(18,0,0,11,32,27)"
      >
        <stop offset="0" stopColor="white" />
        <stop offset="0.46" stopColor="rgb(75,75,75)" />
        <stop offset="0.77" stopColor="rgb(94,94,94)" />
        <stop offset="1" stopColor="rgb(103,103,103)" />
      </linearGradient>
    </defs>
  );
}

/** Shared SVG style flags carried over from the authored mark. */
const MARK_STYLE = {
  fillRule: "evenodd",
  clipRule: "evenodd",
  strokeLinejoin: "round",
  strokeMiterlimit: 2,
} as const;

/**
 * WauxAiStudio brand mark — a dark rounded-square badge holding a white sparkle
 * and a gradient "W" (the React port of `public/logo.svg`). Square icon form;
 * for the icon + wordmark use {@link LogoLockup}.
 *
 * Fills are baked, so the badge does NOT recolor for dark mode — it reads on
 * any surface as-is.
 *
 * @param props.size - Rendered width/height in pixels. Defaults to 24.
 * @param props.title - Accessible name. Omit when the mark sits next to
 *   visible brand text; the SVG is then hidden from assistive tech.
 * @param props.mono - Monochrome outline form: drops the dark badge background
 *   and paints the sparkle + "W" in `currentColor`. Used for the faint hero
 *   watermark; defaults to false (the full baked badge).
 */
export function Logo({
  size = 24,
  title,
  mono = false,
  ...props
}: SVGProps<SVGSVGElement> & {
  size?: number;
  title?: string;
  mono?: boolean;
}) {
  const gradientId = useId();
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
      style={MARK_STYLE}
      {...props}
    >
      <MarkArtwork gradientId={gradientId} mono={mono} />
      {!mono && <MarkDefs gradientId={gradientId} />}
    </svg>
  );
}

/**
 * WauxAiStudio horizontal lockup — the {@link Logo} badge followed by the
 * "WauxAiStudio" wordmark, composed in a single SVG locked to a 16:4.5 aspect
 * ratio (a 320×90 viewBox). Pass `height` (or `width`) and the SVG keeps the
 * ratio; pass both to override. The wordmark uses the app's display font
 * (`--font-poppins`) and `--foreground`, so the text tracks light/dark mode
 * (the badge itself stays the baked dark design).
 *
 * Use this where a banner-shaped logo fits (hero, auth header, share footer);
 * use {@link Logo} for square icon slots. A baked-color copy lives at
 * `public/logo-wordmark.svg`.
 *
 * @param props.height - Rendered height in px. Width derives from 16:4.5.
 * @param props.width - Optional explicit width (overrides the derived one).
 * @param props.title - Accessible name. Defaults to "WauxAiStudio".
 */
export function LogoLockup({
  height = 36,
  width,
  title = "WauxAiStudio",
  ...props
}: SVGProps<SVGSVGElement> & {
  height?: number;
  width?: number;
  title?: string;
}) {
  const gradientId = useId();
  const w = width ?? (height * 16) / 4.5;
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 320 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={MARK_STYLE}
      {...props}
    >
      {/* badge — the 64-grid artwork scaled and seated on the left */}
      <g transform="translate(8,8) scale(1.15625)">
        <MarkArtwork gradientId={gradientId} />
      </g>
      {/* wordmark */}
      <text
        x="100"
        y="46"
        dominantBaseline="central"
        fill="var(--foreground)"
        fontFamily="var(--font-poppins), system-ui, sans-serif"
        fontSize="32"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        WauxAiStudio
      </text>
      <MarkDefs gradientId={gradientId} />
    </svg>
  );
}
