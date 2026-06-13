"use client";

import { cn } from "@/lib/utils";

/**
 * Neobrutalist on/off switch used by the Settings dialog.
 *
 * A controlled `role="switch"` button: the parent owns the value and is
 * notified via {@link onChange}. Honours the global reduced-motion preference
 * through the document-level `data-reduced-motion` attribute (set by
 * `AppConfigProvider`) — the thumb transition is disabled when active.
 *
 * @param props.checked - Current on/off state.
 * @param props.onChange - Called with the next state when toggled.
 * @param props.label - Accessible name for the switch.
 * @param props.disabled - Disable interaction.
 */
export function SettingToggle({
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
        "relative inline-flex h-6 w-11 shrink-0 items-center border-2 border-foreground shadow-nb-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "block size-4 border-2 border-foreground bg-background transition-transform duration-150 [html[data-reduced-motion]_&]:transition-none",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
