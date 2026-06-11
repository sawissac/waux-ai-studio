/**
 * Shared guards & helpers for the site-proxy API routes (`/api/site-proxy`
 * and `/api/site-proxy/asset`).
 *
 * Security: only http(s) URLs pass and obvious private/loopback hosts are
 * rejected to limit SSRF. This is a best-effort guard — it does not resolve
 * DNS, so a public hostname pointing at a private address is not caught. Do
 * not grant these routes access to internal networks.
 */

export const FETCH_TIMEOUT_MS = 15_000;
export const MAX_FONT_BYTES = 2 * 1024 * 1024;

export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Web font extensions servable by the asset route, with their mime types. */
export const FONT_MIME: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

/** Reject loopback / private-range / link-local / IPv6 hosts. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.includes(":") ||
    h.includes("[")
  ) {
    return true;
  }
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) {
    return false;
  }
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** Parse & validate a fetch target. Null when not a fetchable public URL. */
export function validateTarget(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (isBlockedHost(url.hostname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** Mime type for a font URL, or null when it isn't a web font. */
export function fontMime(url: string): string | null {
  try {
    const ext = new URL(url).pathname.match(/\.(\w+)$/)?.[1]?.toLowerCase();
    return ext ? (FONT_MIME[ext] ?? null) : null;
  } catch {
    return null;
  }
}

/** Fetch a binary asset with timeout/size/redirect guards. Null on failure. */
export async function fetchBinary(
  url: string,
  accept: string,
): Promise<ArrayBuffer | null> {
  const res = await fetch(url, {
    headers: { "user-agent": BROWSER_UA, accept },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok || validateTarget(res.url || url) === null) {
    return null;
  }
  const buf = await res.arrayBuffer();
  return buf.byteLength > MAX_FONT_BYTES ? null : buf;
}
