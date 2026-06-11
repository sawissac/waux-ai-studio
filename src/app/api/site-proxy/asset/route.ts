/**
 * GET /api/site-proxy/asset?url=<http(s) web font>
 *
 * Same-origin font relay for proxied site documents. Cross-origin
 * `@font-face` loads require CORS that arbitrary sites don't grant, so the
 * main proxy rewrites font URLs in the page's CSS to point here; the browser
 * then loads only the fonts it actually uses. Responses carry
 * `Access-Control-Allow-Origin: *` because the requesting frames are
 * sandboxed with an opaque (`null`) origin.
 *
 * Deliberately restricted to web-font extensions — this is not a general
 * content relay.
 */
import { fetchBinary, fontMime, validateTarget } from "@/lib/site-proxy";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  const mime = fontMime(raw);
  if (!validateTarget(raw) || !mime) {
    return Response.json(
      { error: "Provide a public http(s) web-font url." },
      { status: 400 },
    );
  }

  let buf: ArrayBuffer | null;
  try {
    buf = await fetchBinary(raw, "font/woff2,*/*;q=0.1");
  } catch {
    buf = null;
  }
  if (!buf) {
    return Response.json(
      { error: "Could not fetch that font." },
      { status: 502 },
    );
  }

  return new Response(buf, {
    headers: {
      "content-type": mime,
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=86400",
    },
  });
}
