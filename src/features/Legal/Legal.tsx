import { LegalShell } from "./components/LegalShell";
import { PrivacyContent } from "./components/PrivacyContent";
import { TermsContent } from "./components/TermsContent";

/** Which legal document the {@link Legal} feature should render. */
export type LegalDoc = "privacy" | "terms";

/** Last-updated date shown on every legal page (ISO source: 2026-06-29). */
const UPDATED = "June 29, 2026";

/** Per-document title + body, selected by the {@link LegalDoc} discriminator. */
const DOCS: Record<LegalDoc, { title: string; body: React.ReactNode }> = {
  privacy: { title: "Privacy Policy", body: <PrivacyContent /> },
  terms: { title: "Terms & Conditions", body: <TermsContent /> },
};

/**
 * Public legal page feature. Renders either the Privacy Policy or the Terms &amp;
 * Conditions inside the shared {@link LegalShell} chrome, selected by the
 * {@link LegalDoc} `doc` prop. Mounted by the thin route shells at `/privacy`
 * and `/terms` (both whitelisted in `src/proxy.ts` so they are reachable while
 * logged out).
 *
 * @param props.doc - Which document to render (`"privacy"` or `"terms"`).
 */
export function Legal({ doc }: { doc: LegalDoc }) {
  const { title, body } = DOCS[doc];
  return (
    <LegalShell title={title} updated={UPDATED}>
      {body}
    </LegalShell>
  );
}
