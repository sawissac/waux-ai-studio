"use client";

import { Check, Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const GEMINI_KEY = "GEMINI_API_KEY";
const OPENROUTER_KEY = "OPENROUTER_API_KEY";
const POPOVER_WIDTH = 320;
const VIEWPORT_PADDING = 8;

function readKey(name: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return window.localStorage.getItem(name) ?? "";
  } catch {
    return "";
  }
}

function writeKey(name: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (value) {
      window.localStorage.setItem(name, value);
    } else {
      window.localStorage.removeItem(name);
    }
  } catch {
    // ignore quota/private-mode errors
  }
}

/** Gear button + popover for managing AI provider API keys in localStorage. */
export function AiKeysButton() {
  const [open, setOpen] = useState(false);
  const [gemini, setGemini] = useState("");
  const [openrouter, setOpenrouter] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenrouter, setShowOpenrouter] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setGemini(readKey(GEMINI_KEY));
    setOpenrouter(readKey(OPENROUTER_KEY));
    setSaved(false);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const place = () => {
      const t = triggerRef.current;
      if (!t) {
        return;
      }
      const rect = t.getBoundingClientRect();
      const top = rect.bottom + 6;
      const maxLeft = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING;
      // anchor popover's right edge to trigger's right edge, then clamp to viewport.
      const desired = rect.right - POPOVER_WIDTH;
      const left = Math.max(VIEWPORT_PADDING, Math.min(desired, maxLeft));
      setCoords({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const save = () => {
    writeKey(GEMINI_KEY, gemini.trim());
    writeKey(OPENROUTER_KEY, openrouter.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="AI settings"
        aria-pressed={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "nb-press grid size-8 place-items-center border-2 border-foreground shadow-nb-sm",
          open
            ? "bg-primary text-primary-foreground"
            : "bg-card text-foreground",
        )}
      >
        <KeyRound size={15} />
      </button>
      {open &&
        coords &&
        portalTarget &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: POPOVER_WIDTH,
              zIndex: 50,
            }}
            className="border-2 border-foreground bg-popover p-3 text-popover-foreground shadow-nb-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold">AI API keys</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-6 place-items-center text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X size={13} />
              </button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Stored in this browser&apos;s localStorage. Per-node keys override
              these.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Gemini
                </label>
                <div className="flex items-center gap-1">
                  <input
                    value={gemini}
                    onChange={(e) => setGemini(e.target.value)}
                    type={showGemini ? "text" : "password"}
                    placeholder="AIza..."
                    className="h-8 flex-1 border-2 border-foreground bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemini((v) => !v)}
                    aria-label={showGemini ? "Hide key" : "Show key"}
                    className="nb-press grid size-8 shrink-0 place-items-center border-2 border-foreground bg-card text-muted-foreground shadow-nb-sm hover:text-foreground"
                  >
                    {showGemini ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  OpenRouter
                </label>
                <div className="flex items-center gap-1">
                  <input
                    value={openrouter}
                    onChange={(e) => setOpenrouter(e.target.value)}
                    type={showOpenrouter ? "text" : "password"}
                    placeholder="sk-or-..."
                    className="h-8 flex-1 border-2 border-foreground bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenrouter((v) => !v)}
                    aria-label={showOpenrouter ? "Hide key" : "Show key"}
                    className="nb-press grid size-8 shrink-0 place-items-center border-2 border-foreground bg-card text-muted-foreground shadow-nb-sm hover:text-foreground"
                  >
                    {showOpenrouter ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              {saved && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                  <Check size={12} /> Saved
                </span>
              )}
              <button
                type="button"
                onClick={save}
                className="nb-press border-2 border-foreground bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-nb-sm"
              >
                Save
              </button>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
}
