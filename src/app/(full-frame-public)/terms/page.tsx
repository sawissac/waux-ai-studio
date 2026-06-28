import type { Metadata } from "next";

import { Legal } from "@/features/Legal";

export const metadata: Metadata = {
  title: "Terms & Conditions — WauxAiStudio",
  description:
    "The terms that govern your use of WauxAiStudio, including acceptable use and AI bring-your-own-key features.",
};

/** Public `/terms` route. Thin shell mounting the `Legal` feature. */
export default function TermsPage() {
  return <Legal doc="terms" />;
}
