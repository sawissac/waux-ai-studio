"use client";

import { Boxes, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { signIn, signUp } from "./actions";

type Mode = "signin" | "signup";
type ViewState = "form" | "check-email";

/**
 * Full-page authentication form supporting email/password sign-in and sign-up.
 *
 * Server actions (`signIn` / `signUp`) call Supabase Auth and redirect on
 * success; this component only manages local UI state (mode toggle, loading,
 * error, password visibility).
 */
export function AuthLogin() {
  const [mode, setMode] = useState<Mode>("signin");
  const [view, setView] = useState<ViewState>("form");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const email = data.get("email") as string;
    const password = data.get("password") as string;

    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      setView("check-email");
      setLoading(false);
    }
    // sign-in: server action calls redirect(), so loading stays true until nav.
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div
        className={cn(
          "w-full max-w-sm space-y-8",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-2",
          "duration-[--motion-duration-slow] ease-[--motion-ease-standard]",
        )}
      >
        {/* Wordmark */}
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">
              T
            </span>
            <span className="font-display text-lg font-semibold">
              Tool Builder
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {view === "check-email"
              ? "Check your email"
              : mode === "signin"
                ? "Sign in to your workspace"
                : "Create your account"}
          </p>
        </div>

        {view === "check-email" ? (
          <CheckEmailState
            onBackToSignIn={() => {
              setView("form");
              setMode("signin");
            }}
          />
        ) : (
          <>
            {/* Form card */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={cn(
                    "h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "transition-[border-color,box-shadow] duration-[--motion-duration-fast]",
                    "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    "disabled:opacity-50",
                  )}
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    placeholder="••••••••"
                    minLength={6}
                    className={cn(
                      "h-9 w-full rounded-md border bg-background py-2 pl-3 pr-9 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "transition-[border-color,box-shadow] duration-[--motion-duration-fast]",
                      "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      "disabled:opacity-50",
                    )}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className={cn(
                      "absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
                      "@media (hover: hover) { hover:text-foreground }",
                      "transition-colors duration-[--motion-duration-fast]",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    )}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p
                  role="alert"
                  className={cn(
                    "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
                    "animate-in fade-in slide-in-from-top-1 duration-[--motion-duration-base]",
                  )}
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className={cn(
                  "w-full transition-transform duration-[--motion-duration-instant]",
                  "active:scale-[0.98]",
                )}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </>
                ) : mode === "signin" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            {/* Mode toggle */}
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signin"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={toggleMode}
                className={cn(
                  "font-medium text-foreground underline-offset-4",
                  "hover:underline",
                  "transition-colors duration-[--motion-duration-fast]",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded",
                )}
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CheckEmailState({ onBackToSignIn }: { onBackToSignIn: () => void }) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border bg-card p-6 shadow-sm text-center",
        "animate-in fade-in slide-in-from-bottom-1 duration-[--motion-duration-base]",
      )}
    >
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
        <Boxes className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">Confirm your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to your inbox. Click it to activate your
          account and sign in.
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={onBackToSignIn}>
        Back to sign in
      </Button>
    </div>
  );
}
