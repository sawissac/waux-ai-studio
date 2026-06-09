import { AuthLogin } from "@/features/AuthLogin";

/** Public login/sign-up page. Middleware redirects here when unauthenticated. */
export default function LoginPage() {
  return <AuthLogin />;
}
