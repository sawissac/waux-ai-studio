"use client";

import { cn } from "@/lib/utils";

/**
 * Neobrutalist on/off switch used by the Gallery manage page.
 *
 * A controlled `role="switch"` button: the parent owns the value and is
 * notified via {@link onChange}. The thumb transition uses the shared fast
 * motion token and is disabled under the global reduced-motion preference
 * (set by `AppConfigProvider` on the document).
 *
 * @param props.checked - Current on/off state.
 * @param props.onChange - Called with the next state when toggled.
 * @param props.label - Accessible name for the switch.
 * @param props.disabled - Disable interaction.
 */
export function GalleryToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center border-2 border-foreground shadow-nb-sm outline-none transition-colors duration-(--motion-duration-fast) focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "block size-4 border-2 border-foreground bg-background transition-transform duration-(--motion-duration-fast) [html[data-reduced-motion]_&]:transition-none",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
