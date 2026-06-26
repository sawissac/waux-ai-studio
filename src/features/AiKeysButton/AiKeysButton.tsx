"use client";

import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GEMINI_KEY = "GEMINI_API_KEY";
const OPENROUTER_KEY = "OPENROUTER_API_KEY";

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

/** Key button + dialog for managing AI provider API keys in localStorage. */
export function AiKeysButton() {
  const [open, setOpen] = useState(false);
  const [gemini, setGemini] = useState("");
  const [openrouter, setOpenrouter] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenrouter, setShowOpenrouter] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setGemini(readKey(GEMINI_KEY));
    setOpenrouter(readKey(OPENROUTER_KEY));
    setShowGemini(false);
    setShowOpenrouter(false);
    setSaved(false);
  }, [open]);

  const save = () => {
    writeKey(GEMINI_KEY, gemini.trim());
    writeKey(OPENROUTER_KEY, openrouter.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const inputCls =
    "h-9 w-full border-2 border-foreground bg-background pl-3 pr-10 font-mono text-sm shadow-nb-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <>
      <button
        type="button"
        aria-label="AI settings"
        aria-pressed={open}
        onClick={() => setOpen(true)}
        className="nb-press grid size-8 place-items-center border-2 border-foreground bg-card text-foreground shadow-nb-sm"
      >
        <KeyRound size={15} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={15} />
              API Key Setup
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  value={gemini}
                  onChange={(e) => setGemini(e.target.value)}
                  type={showGemini ? "text" : "password"}
                  placeholder="AIza..."
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowGemini((v) => !v)}
                  aria-label={showGemini ? "Hide key" : "Show key"}
                  className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showGemini ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                OpenRouter API Key
              </label>
              <div className="relative">
                <input
                  value={openrouter}
                  onChange={(e) => setOpenrouter(e.target.value)}
                  type={showOpenrouter ? "text" : "password"}
                  placeholder="sk-or-..."
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowOpenrouter((v) => !v)}
                  aria-label={showOpenrouter ? "Hide key" : "Show key"}
                  className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showOpenrouter ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground/70">
              Keys are saved in your browser only and never sent to our servers.
              Per-node keys override these.
            </p>
          </div>

          <DialogFooter>
            {saved && (
              <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-emerald-600">
                <Check size={12} /> Saved
              </span>
            )}
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
