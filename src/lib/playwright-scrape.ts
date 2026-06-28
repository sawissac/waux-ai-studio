/**
 * Browser-side helper for the Playwright Scraper node.
 *
 * Unlike the HTTP Request node (which relays through a same-origin SSRF-guarded
 * proxy), this calls the **local** Playwright scrape server in this repo
 * directly — its base URL is supplied by the author on the node. That server
 * (`playwright/server/scrape-server.mjs`) drives a real Chromium browser, so it
 * must be running locally and reachable from the browser:
 *
 * ```bash
 * pnpm --dir playwright install            # once
 * pnpm --dir playwright exec playwright install chromium  # once
 * pnpm --dir playwright serve              # starts http://localhost:3001
 * ```
 *
 * The server enables permissive CORS so the builder (a different port) can POST
 * to it from the page. See `playwright/SCRAPE.md` for the full request/response
 * contract.
 */

/** Request payload for the scrape server's `POST /scrape` endpoint. */
export interface PlaywrightScrapeSpec {
  /** Base URL of the local scrape endpoint, e.g. `http://localhost:3001/scrape`. */
  serverUrl: string;
  /** Page (or login page) to open first. */
  url: string;
  /** When `goto` resolves. */
  waitUntil?: string;
  /** Optional CSS selector to wait for after navigation/actions. */
  waitForSelector?: string;
  /** Per-step timeout in ms (capped server-side by `MAX_TIMEOUT`). */
  timeout?: number;
  /** Output-key → selector-rule map (already parsed from the node's JSON). */
  selectors: Record<string, unknown>;
  /** Pre-extraction actions (already parsed from the node's JSON). */
  actions?: unknown[];
  /** Reuse a saved server session by name (skip login). */
  session?: string;
  /** Save the post-run session under this name on the server. */
  saveSession?: string;
}

/** Success response from the scrape server. */
export interface PlaywrightScrapeResult {
  /** The originally requested URL. */
  url: string;
  /** The page URL after navigation + actions (e.g. after a login redirect). */
  finalUrl?: string;
  /** The extracted data — mirrors the `selectors` map key-for-key. */
  data: Record<string, unknown>;
  /** Wall-clock time the scrape took, in ms. */
  tookMs?: number;
  /** Echoed name when `saveSession` was used. */
  savedSession?: string;
}

/**
 * Run a scrape against the local Playwright server.
 *
 * @param spec - The fully-resolved request (URL/selectors/actions already
 *   interpolated and parsed).
 * @returns The parsed success payload (`data`, `finalUrl`, …).
 * @throws When the server is unreachable (server not running / wrong URL / CORS)
 *   or returns an error status — the message includes the server's `error` and,
 *   for an action failure, the failing step index.
 */
export async function playwrightScrape(
  spec: PlaywrightScrapeSpec,
): Promise<PlaywrightScrapeResult> {
  const { serverUrl, ...body } = spec;

  let res: Response;
  try {
    res = await fetch(serverUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Almost always: the local server isn't running, the URL is wrong, or CORS
    // blocked the call. Surface an actionable hint rather than a bare TypeError.
    throw new Error(
      `Could not reach the Playwright scrape server at ${serverUrl}. Is it running locally? (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  const payload = (await res.json().catch(() => null)) as
    | (PlaywrightScrapeResult & { error?: string })
    | { error: string }
    | null;

  if (!res.ok || !payload || "error" in payload) {
    const detail =
      payload && "error" in payload && payload.error
        ? payload.error
        : `scrape failed (HTTP ${res.status})`;
    throw new Error(detail);
  }

  return payload;
}
