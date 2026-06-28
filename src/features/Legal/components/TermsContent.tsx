/** GitHub repository — the contact channel for terms and support requests. */
const REPO_URL = "https://github.com/sawissac/waux-ai-studio";

/**
 * Terms &amp; Conditions prose for WauxAiStudio.
 *
 * Covers account responsibilities, acceptable use, ownership of user content,
 * the bring-your-own-key AI model, third-party disclaimers, warranty/liability
 * limits, and termination. Rendered inside the `prose` column of
 * {@link LegalShell}; emits semantic HTML only.
 *
 * No governing-law / jurisdiction clause is included by request. English-only,
 * matching the public landing page.
 */
export function TermsContent() {
  return (
    <>
      <p>
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your use of
        WauxAiStudio (&ldquo;the Service&rdquo;). By accessing or using the
        Service, you agree to these Terms. If you do not agree, do not use the
        Service.
      </p>

      <h2>The Service</h2>
      <p>
        WauxAiStudio lets you build and run tools as visual node chains, preview
        them, and optionally publish them via share links or a public gallery.
        Tools run primarily in your browser; some features call external
        services as described below.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must provide accurate information when creating an account.</li>
        <li>
          You are responsible for keeping your credentials secure and for all
          activity that occurs under your account.
        </li>
        <li>
          You must be old enough to form a binding agreement in your
          jurisdiction to use the Service.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for any unlawful, harmful, or abusive purpose;</li>
        <li>
          upload or generate content that infringes others&rsquo; rights or that
          is malicious (for example, malware);
        </li>
        <li>
          use website or scraper nodes in a way that violates a target
          site&rsquo;s terms, robots rules, or applicable law;
        </li>
        <li>
          attempt to disrupt, overload, reverse-engineer, or gain unauthorized
          access to the Service or its infrastructure;
        </li>
        <li>resell or misrepresent the Service as your own.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of the tools and content you create. You grant us a
        limited license to store, process, and display that content solely to
        operate the Service for you. When you publish a tool through a share
        link or the public gallery, you make it publicly accessible and you are
        responsible for what it contains.
      </p>

      <h2>AI features &amp; your keys</h2>
      <p>
        AI nodes and the builder chat use API keys that <strong>you</strong>{" "}
        supply, stored only in your browser. Your use of any AI provider is
        subject to that provider&rsquo;s terms, and you are responsible for any
        usage and charges on your keys. AI output may be inaccurate or
        incomplete; you are responsible for reviewing and how you use it.
      </p>

      <h2>Third-party services</h2>
      <p>
        The Service integrates with third-party providers (hosting,
        authentication, AI providers, and sites you choose to fetch). We do not
        control and are not responsible for those services, their availability,
        or their content. Your use of them is governed by their respective
        terms.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The WauxAiStudio name, software, and design are protected by applicable
        intellectual-property laws. These Terms do not grant you any rights to
        our trademarks or branding beyond using the Service as intended.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;, without warranties of any kind, whether express or
        implied, including fitness for a particular purpose and
        non-infringement. We do not warrant that the Service will be
        uninterrupted, error-free, or secure.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any
        indirect, incidental, special, consequential, or punitive damages, or
        for any loss of data, profits, or content, arising from your use of the
        Service.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate
        access if you violate these Terms or use the Service in a way that risks
        harm to others or to the Service.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        reflected by updating the &ldquo;Last updated&rdquo; date at the top of
        this page. Continued use of the Service after a change means you accept
        the updated Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Reach out through the project&rsquo;s{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub repository
        </a>
        .
      </p>
    </>
  );
}
