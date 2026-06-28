import type { Metadata } from "next";

import { Legal } from "@/features/Legal";

export const metadata: Metadata = {
  title: "Privacy Policy — WauxAiStudio",
  description:
    "How WauxAiStudio handles your account, the tools you build, and your AI provider keys.",
};

/** Public `/privacy` route. Thin shell mounting the `Legal` feature. */
export default function PrivacyPage() {
  return <Legal doc="privacy" />;
}
