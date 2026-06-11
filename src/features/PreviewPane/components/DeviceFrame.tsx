"use client";

import { Maximize, Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { VIEWPORT_DEVICES } from "@/constants/tool-builder";
import { cn } from "@/lib/utils";
import type { ViewportDevice } from "@/types/tool-builder";

/** Toggle icon per simulated screen. */
const DEVICE_ICONS: Record<ViewportDevice, typeof Monitor> = {
  responsive: Maximize,
  desktop: Monitor,
  mobile: Smartphone,
};

/** Segmented fill / desktop / mobile switch shared by the website nodes. */
export function DeviceToggle({
  value,
  onChange,
}: {
  value: ViewportDevice;
  onChange: (next: ViewportDevice) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-border/60 bg-muted/40 p-0.5">
      {VIEWPORT_DEVICES.map((d) => {
        const Icon = DEVICE_ICONS[d.value];
        return (
          <button
            key={d.value}
            type="button"
            title={d.width ? `${d.label} (${d.width}×${d.height})` : d.label}
            aria-label={`${d.label} screen`}
            onClick={() => onChange(d.value)}
            className={cn(
              "rounded-md px-2 py-1 transition-colors duration-(--motion-duration-fast)",
              value === d.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sandboxed iframe shared by the View Port and Themed nodes. `responsive`
 * fills the pane width at `height`; fixed screens render the document at the
 * device's width/height and scale the whole frame down (never up) to fit the
 * pane, so the page lays out exactly as it would on that screen width.
 *
 * Pass either `src` (remote page) or `srcDoc` (inline document).
 */
export function DeviceFrame({
  device,
  height,
  title,
  src,
  srcDoc,
  sandbox = "allow-scripts allow-same-origin allow-forms allow-popups",
}: {
  device: ViewportDevice;
  height: number;
  title: string;
  src?: string;
  srcDoc?: string;
  sandbox?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const source = src !== undefined ? { src } : { srcDoc };
  const dims = VIEWPORT_DEVICES.find((d) => d.value === device);
  const fixed = dims?.width && dims?.height ? dims : null;

  if (!fixed) {
    return (
      <div ref={ref} className="w-full">
        <iframe
          {...source}
          title={title}
          style={{ height }}
          sandbox={sandbox}
          referrerPolicy="no-referrer"
          className="w-full rounded-xl border border-input bg-background shadow-sm"
        />
      </div>
    );
  }

  const scale =
    containerW > 0 ? Math.min(1, containerW / (fixed.width as number)) : 1;
  return (
    <div ref={ref} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-xl border border-input bg-background shadow-sm"
        style={{
          width: (fixed.width as number) * scale,
          height: (fixed.height as number) * scale,
        }}
      >
        <iframe
          {...source}
          title={title}
          width={fixed.width}
          height={fixed.height}
          sandbox={sandbox}
          referrerPolicy="no-referrer"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
          }}
          className="bg-background"
        />
      </div>
    </div>
  );
}
