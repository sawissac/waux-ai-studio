import { AuthResetPassword } from "@/features/AuthResetPassword";

/** Set-a-new-password page, reached via the `/auth/callback` recovery link. */
export default function ResetPasswordPage() {
  return <AuthResetPassword />;
}
