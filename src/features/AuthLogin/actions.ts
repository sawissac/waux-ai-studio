"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Sign in with email + password.
 * Returns `{ error }` on failure; redirects to `/` on success.
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

  redirect("/");
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
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  return undefined;
}

/**
 * Sign out the current user and redirect to `/login`.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
