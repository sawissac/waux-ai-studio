/**
 * GET /api/site-proxy?url=<http(s) page>
 *
 * Server-side fetch for the Themed website node. Cross-origin iframes are
 * opaque to the client, so this route downloads the page HTML, strips its
 * scripts (the themed output renders in a script-free sandbox), inlines its
 * linked stylesheets (so the client can extract & rewrite colors), reroutes
 * web-font URLs through the same-origin `/api/site-proxy/asset` relay (font
 * loads require CORS that arbitrary sites don't grant), and injects a
 * `<base>` tag so remaining relative asset URLs keep resolving against the
 * original site.
 *
 * Returns `{ html, url }` on success or `{ error }` with a 4xx/5xx status.
 *
 * Security: see {@link validateTarget} in `@/lib/site-proxy` for the SSRF
 * guards.
 */
import {
  BROWSER_UA,
  FETCH_TIMEOUT_MS,
  fontMime,
  validateTarget,
} from "@/lib/site-proxy";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_STYLESHEETS = 20;

/** Fetch text with a timeout, size cap, and browser-like headers. */
async function fetchText(
  url: string,
  accept: string,
): Promise<{ text: string; finalUrl: string } | null> {
  const res = await fetch(url, {
    headers: { "user-agent": BROWSER_UA, accept },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    return null;
  }
  const finalUrl = res.url || url;
  if (validateTarget(finalUrl) === null) {
    // A redirect landed somewhere we refuse to fetch (e.g. an internal host).
    return null;
  }
  const text = await res.text();
  if (text.length > MAX_BODY_BYTES) {
    return null;
  }
  return { text, finalUrl };
}

/** Absolute web-font URLs anywhere in the document (CSS url(), link href). */
const FONT_URL =
  /https?:\/\/[^\s"'()<>]+\.(?:woff2|woff|ttf|otf)(?:\?[^\s"'()<>]*)?/gi;

/**
 * Reroute web-font URLs through the same-origin `/api/site-proxy/asset`
 * relay. Cross-origin `@font-face` loads require CORS; the relay answers
 * with `Access-Control-Allow-Origin: *`, and the browser only requests the
 * fonts the page actually uses — no payload bloat from inlining. Images are
 * left alone (image loads are exempt from CORS).
 */
function rerouteFontUrls(
  html: string,
  appOrigin: string,
  pageUrl: string,
): string {
  const relay = (abs: string) =>
    `${appOrigin}/api/site-proxy/asset?url=${encodeURIComponent(abs)}`;
  let out = html.replace(FONT_URL, (url) =>
    validateTarget(url) ? relay(url) : url,
  );
  // Site-relative font paths appear in preload links and inside framework
  // bootstrap data (e.g. Next.js flight payloads re-inject font preloads at
  // hydration). Left alone they resolve via <base> back to the original host
  // — a guaranteed CORS failure, since font fetches always run in CORS mode.
  // Resolve & relay them wherever they appear; the guard skips paths already
  // pointing at the relay (its encoded `url=` also ends in a font extension).
  out = out.replace(
    /\/[^"'()\s\\<>]+\.(?:woff2|woff|ttf|otf)(?:\?[^"'()\s\\<>]*)?/gi,
    (path) => {
      if (path.includes("/api/site-proxy/asset")) {
        return path;
      }
      try {
        const abs = new URL(path, pageUrl).href;
        return fontMime(abs) && validateTarget(abs) ? relay(abs) : path;
      } catch {
        return path;
      }
    },
  );
  return out;
}

/** Rewrite relative `url(...)` refs in CSS to absolute against the sheet URL. */
function absolutizeCssUrls(css: string, baseUrl: string): string {
  return css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (match, quote: string, ref: string) => {
      if (/^(data:|blob:|https?:|\/\/|#)/i.test(ref.trim())) {
        return match;
      }
      try {
        return `url(${quote}${new URL(ref.trim(), baseUrl).href}${quote})`;
      } catch {
        return match;
      }
    },
  );
}

const STYLESHEET_LINK =
  /<link\b[^>]*\brel\s*=\s*(?:"[^"]*stylesheet[^"]*"|'[^']*stylesheet[^']*')[^>]*>/gi;

function linkHref(tag: string): string {
  const m = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const raw = requestUrl.searchParams.get("url") ?? "";
  const target = validateTarget(raw);
  if (!target) {
    return Response.json(
      { error: "Provide a public http(s) url." },
      { status: 400 },
    );
  }

  let page: { text: string; finalUrl: string } | null;
  try {
    page = await fetchText(
      target.href,
      "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    );
  } catch {
    page = null;
  }
  if (!page) {
    return Response.json(
      { error: "Could not fetch that page." },
      { status: 502 },
    );
  }

  let html = page.text;

  // Drop CSP meta tags — they can block the inlined styles. The document is
  // served from our origin into a sandboxed frame, so the original policy no
  // longer applies.
  html = html.replace(
    /<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi,
    "",
  );

  // Detect client-side-rendered pages before stripping scripts: their body is
  // painted by JS at hydration, so the static HTML carries no content. The
  // script-free sandbox would render an empty frame — surface an honest error
  // instead of a silent blank. Catches the explicit Next.js CSR-bailout marker
  // and the general case (a body that's empty once tags are removed).
  const bodyInner = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const visibleText = bodyInner
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<template\b[\s\S]*?<\/template\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  if (
    /BAILOUT_TO_CLIENT_SIDE_RENDERING/.test(html) ||
    visibleText.length < 20
  ) {
    return Response.json(
      {
        error:
          "This page renders its content in the browser (client-side), so there's no static HTML to copy.",
      },
      { status: 422 },
    );
  }

  // Drop scripts — themed output is rendered without allow-scripts, so this
  // mostly trims weight and noscript fallbacks render instead.
  html = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<noscript\b[^>]*>|<\/noscript\s*>/gi, "");

  // Inline linked stylesheets in place so the cascade order is preserved and
  // the client can see (and rewrite) every color. Failed sheets keep their
  // original tag with an absolutized href as a render-only fallback.
  const links = [...new Set(html.match(STYLESHEET_LINK) ?? [])].slice(
    0,
    MAX_STYLESHEETS,
  );
  for (const tag of links) {
    const href = linkHref(tag);
    if (!href) {
      continue;
    }
    let sheetUrl: string;
    try {
      sheetUrl = new URL(href, page.finalUrl).href;
    } catch {
      continue;
    }
    if (!validateTarget(sheetUrl)) {
      continue;
    }
    let sheet: { text: string; finalUrl: string } | null;
    try {
      sheet = await fetchText(sheetUrl, "text/css,*/*;q=0.1");
    } catch {
      sheet = null;
    }
    const replacement = sheet
      ? `<style data-inlined-from="${sheetUrl}">\n${absolutizeCssUrls(sheet.text, sheet.finalUrl)}\n</style>`
      : tag.replace(/\bhref\s*=\s*(?:"[^"]*"|'[^']*')/i, `href="${sheetUrl}"`);
    html = html.split(tag).join(replacement);
  }

  // With stylesheets inlined (urls now absolute), send the page's web fonts
  // through the same-origin relay so the sandboxed copies aren't CORS-blocked.
  html = rerouteFontUrls(html, requestUrl.origin, page.finalUrl);

  // Anchor relative asset URLs (images in untouched markup) to the original
  // site. Skipped when the page already declares a <base>.
  if (!/<base\b/i.test(html)) {
    const inject = `<base href="${page.finalUrl}">`;
    const headMatch = html.match(/<head\b[^>]*>/i);
    html = headMatch
      ? html.replace(headMatch[0], `${headMatch[0]}${inject}`)
      : `${inject}${html}`;
  }

  return Response.json({ html, url: page.finalUrl });
}
