"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the public site origin used to build auth-email links.
 *
 * Prefers `NEXT_PUBLIC_SITE_URL` (set this to the deployed URL,
 * e.g. https://toolkits-black.vercel.app) so confirmation/reset links always
 * point at the real site instead of whatever host the request came in on.
 * Falls back to request headers for local dev.
 */
async function getOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const h = await headers();
  const origin = h.get("origin");
  if (origin) {
    return origin;
  }
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Sign in with email + password.
 * Returns `{ error }` on failure; redirects to the post-login welcome splash
 * (`/welcome`) on success, which then hands off to the studio (`/studio`).
 */
export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/welcome");
}

/**
 * Sign up with email + password.
 * Returns `{ error }` on failure; returns `undefined` on success so the client
 * can show the "check your email" confirmation state.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // After the user clicks the confirmation link, land them on /login.
    options: { emailRedirectTo: `${origin}/login` },
  });

  if (error) {
    return { error: error.message };
  }

  return undefined;
}

/**
 * Send a password-reset email. The link lands on `/auth/callback`, which
 * exchanges the recovery code for a session and forwards to `/reset-password`.
 *
 * Returns `{ error }` on failure; `undefined` on success so the client can show
 * a "check your email" state. Note: Supabase does not reveal whether the email
 * exists, so success here does not confirm an account.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return undefined;
}

/**
 * Set a new password for the currently authenticated (recovery-session) user.
 * Reached only after `/auth/callback` established the recovery session.
 *
 * Returns `{ error }` on failure; redirects to `/studio` on success.
 */
export async function updatePassword(
  password: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/studio");
}

/**
 * Sign out the current user and redirect to `/login`.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
