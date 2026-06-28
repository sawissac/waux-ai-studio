/** GitHub repository — the contact channel for privacy and support requests. */
const REPO_URL = "https://github.com/sawissac/waux-ai-studio";

/**
 * Privacy Policy prose for WauxAiStudio.
 *
 * Describes the data the product actually handles: Supabase-backed accounts and
 * saved tools, browser-local preferences, and user-supplied AI provider keys
 * that never leave the browser. Rendered inside the `prose` column of
 * {@link LegalShell}; emits semantic HTML only (no own layout/chrome).
 *
 * English-only, matching the public landing page. Keep this in sync with how
 * the app stores data — if the storage model changes, update this copy.
 */
export function PrivacyContent() {
  return (
    <>
      <p>
        This Privacy Policy explains what information WauxAiStudio (&ldquo;the
        Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you
        use the application, how it is used, and the choices you have.
        WauxAiStudio is a tool that lets you build and run tools as visual node
        chains. By using the Service you agree to this policy.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information.</strong> When you create an account we
          collect your email address and a password. Authentication and password
          storage are handled by our infrastructure provider; we do not store
          your password in plain text and cannot read it.
        </li>
        <li>
          <strong>Content you create.</strong> The tools you build — node
          chains, their configuration, names, icons, and gallery settings — are
          stored in our database and associated with your account so we can save
          and reload your work.
        </li>
        <li>
          <strong>Device preferences.</strong> Settings such as theme, language,
          and other interface preferences are stored only in your
          browser&rsquo;s local storage on your device. They are not sent to our
          servers.
        </li>
        <li>
          <strong>AI provider keys.</strong> If you use AI-powered nodes or the
          builder chat, the API keys you provide (for example, Gemini or
          OpenRouter) are stored{" "}
          <strong>only in your browser&rsquo;s local storage</strong>. They
          never reach our servers. AI requests are sent directly from your
          browser to the chosen provider.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>We use the information above to:</p>
      <ul>
        <li>authenticate you and keep your account secure;</li>
        <li>save, load, and let you manage the tools you build;</li>
        <li>publish tools you choose to share or add to a public gallery;</li>
        <li>operate, maintain, and improve the Service.</li>
      </ul>
      <p>
        We do not sell your personal information, and we do not use the content
        of your tools for advertising.
      </p>

      <h2>Third-party services</h2>
      <p>
        Some features rely on external services, and using them sends data to
        those providers under their own terms and privacy policies:
      </p>
      <ul>
        <li>
          <strong>Hosting &amp; database.</strong> Your account and saved tools
          are stored with our cloud infrastructure provider.
        </li>
        <li>
          <strong>AI providers.</strong> When you run an AI node or the builder
          chat, the prompt and the relevant content from your tool are sent
          directly from your browser to the AI provider you selected.
        </li>
        <li>
          <strong>Website / scraper nodes.</strong> Nodes that fetch a web page
          request the exact URL you specify. The request is made to that site;
          treat any data you pull in accordingly.
        </li>
        <li>
          <strong>External links.</strong> The Service links to third-party
          sites (such as our source repository on GitHub). We are not
          responsible for their content or privacy practices.
        </li>
      </ul>

      <h2>Public sharing</h2>
      <p>
        Share links and the public gallery make the tools you choose publicly
        accessible to anyone with the link or who visits the gallery. Anything
        you publish — including node configuration and any data baked into a
        tool — becomes public. Do not publish private or sensitive information.
      </p>

      <h2>Data retention &amp; deletion</h2>
      <p>
        We keep your account and saved tools for as long as your account is
        active. You can delete tools at any time within the app. To request
        deletion of your account and associated data, contact us through the
        channel below.
      </p>

      <h2>Security</h2>
      <p>
        We take reasonable measures to protect your information. However, no
        method of transmission or storage is completely secure, and we cannot
        guarantee absolute security. Because your AI keys and preferences live
        in your browser, keep your device secure.
      </p>

      <h2>Children</h2>
      <p>
        The Service is not directed to children, and we do not knowingly collect
        personal information from children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be reflected by updating the &ldquo;Last updated&rdquo; date at the
        top of this page. Continued use of the Service after a change means you
        accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions or requests, reach out through the project&rsquo;s{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub repository
        </a>
        .
      </p>
    </>
  );
}
