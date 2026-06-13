/**
 * Browser-side helper for the HTTP Request node. Posts the request spec to the
 * same-origin `/api/http-proxy` relay (which makes the real cross-origin call
 * server-side, dodging CORS and keeping auth headers off the network tab) and
 * returns the parsed body.
 */

export interface HttpProxySpec {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpProxyResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  /** Parsed JSON value, or the raw text, per `responseType`. */
  body: unknown;
}

/**
 * Issue an HTTP request through the server proxy.
 *
 * @param spec - Method, URL, headers, and optional body (already interpolated).
 * @param responseType - `json` parses the body (falls back to text on parse
 *   failure); `text` returns the raw string.
 * @throws When the proxy itself errors (network, SSRF block, bad method).
 */
export async function httpRequest(
  spec: HttpProxySpec,
  responseType: "json" | "text",
): Promise<HttpProxyResult> {
  const res = await fetch("/api/http-proxy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(spec),
  });

  const payload = (await res.json()) as
    | { error: string }
    | {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
      };

  if ("error" in payload) {
    throw new Error(payload.error);
  }

  let body: unknown = payload.body;
  if (responseType === "json") {
    try {
      body = JSON.parse(payload.body);
    } catch {
      // Upstream didn't return valid JSON — keep the raw text.
      body = payload.body;
    }
  }

  return {
    status: payload.status,
    statusText: payload.statusText,
    headers: payload.headers,
    body,
  };
}
