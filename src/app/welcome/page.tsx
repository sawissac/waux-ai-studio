import { WelcomeSplash } from "@/features/WelcomeSplash";

/**
 * Post-login branding splash. Reached only right after a successful sign-in —
 * `signIn` redirects here instead of `/`. Gated to authenticated users by the
 * session proxy (any non-public path redirects logged-out users to `/login`).
 */
export default function WelcomePage() {
  return <WelcomeSplash />;
}
