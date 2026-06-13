/**
 * POST /api/http-proxy
 *
 * Server-side relay for the HTTP Request node. Browsers can't call arbitrary
 * cross-origin APIs (CORS) and any auth headers would be exposed in the
 * network tab, so the node posts the request spec here and this route makes
 * the real call, returning the status, headers, and body.
 *
 * Request body: `{ method, url, headers, body }`.
 * Response: `{ status, statusText, headers, body }` on success, or
 * `{ error }` with a 4xx/5xx status.
 *
 * Security: the target is validated with the same SSRF guard the site-proxy
 * uses (`validateTarget` — only public http(s) hosts pass). See
 * `@/lib/site-proxy` for the limitations of that guard.
 */
import { FETCH_TIMEOUT_MS, validateTarget } from "@/lib/site-proxy";

/** Cap the response body we read back into JSON (matches site-proxy). */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

interface HttpProxyRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
}

export async function POST(request: Request) {
  let spec: HttpProxyRequest;
  try {
    spec = (await request.json()) as HttpProxyRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const method = String(spec.method ?? "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return Response.json(
      { error: `Unsupported method: ${method}` },
      { status: 400 },
    );
  }

  if (validateTarget(spec.url ?? "") === null) {
    return Response.json(
      { error: "Only public http(s) URLs can be requested." },
      { status: 400 },
    );
  }

  // Drop hop-by-hop / forbidden headers; keep the author's request headers.
  const headers = new Headers();
  for (const [k, v] of Object.entries(spec.headers ?? {})) {
    if (!k || /^(host|content-length|connection)$/i.test(k)) {
      continue;
    }
    headers.set(k, v);
  }

  const hasBody = method !== "GET" && method !== "DELETE" && !!spec.body;

  let res: Response;
  try {
    res = await fetch(spec.url!, {
      method,
      headers,
      body: hasBody ? spec.body : undefined,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upstream request failed.";
    return Response.json({ error: message }, { status: 502 });
  }

  // A redirect could have landed somewhere we refuse to surface.
  if (validateTarget(res.url || spec.url!) === null) {
    return Response.json(
      { error: "Request redirected to a blocked host." },
      { status: 400 },
    );
  }

  const text = await res.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json(
      { error: "Response body too large." },
      { status: 502 },
    );
  }

  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return Response.json({
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
    body: text,
  });
}
