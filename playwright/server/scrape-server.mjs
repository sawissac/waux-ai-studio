import { chromium } from "playwright";
import express from "express";

/**
 * Dynamic Playwright scrape API.
 *
 * A single long-lived Chromium browser is reused across requests; each request
 * gets a fresh isolated context + page. Callers POST a URL plus a map of
 * extraction rules and get back the extracted data.
 *
 * Endpoints:
 *   GET  /health   liveness probe
 *   POST /scrape   run an extraction (see `scrapeHandler`)
 *
 * Optional auth: if `API_KEY` is set, requests must supply the key either as
 * `Authorization: Bearer <API_KEY>` or as `apiKey` in the JSON body.
 */

const PORT = Number(process.env.PORT ?? 3001);
const API_KEY = process.env.API_KEY ?? "";
const MAX_TIMEOUT = Number(process.env.MAX_TIMEOUT ?? 60_000);

/** Shared browser handle, launched lazily on first request. */
let browserPromise = null;

/**
 * In-memory store of logged-in sessions, keyed by name.
 * A session is a Playwright `storageState` (cookies + localStorage) captured
 * after a login flow, so later requests can skip logging in again.
 * Cleared on server restart (not persisted to disk).
 * @type {Map<string, import("playwright").BrowserContextOptions["storageState"]>}
 */
const sessions = new Map();

/**
 * Get (or launch once) the shared Chromium instance.
 * @returns {Promise<import("playwright").Browser>}
 */
function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserPromise;
}

/**
 * Normalize one extraction rule into a canonical object form.
 * Shorthand string `"h1"` becomes `{ selector: "h1" }` (text of first match).
 *
 * @param {string | object} rule
 * @returns {{ selector: string, attr?: string, all?: boolean, html?: boolean, meta?: boolean, excludeClass?: boolean }}
 */
function normalizeRule(rule) {
  if (typeof rule === "string") return { selector: rule };
  if (rule && typeof rule.selector === "string") return rule;
  throw new Error("each selector rule needs a `selector` string");
}

/**
 * Extract one rule's value from the page.
 *
 * - `all: true`  → array over every matched element
 * - `meta: true` → `{ tag, attrs: {name: value, …}, text }` per element
 * - `excludeClass: true` → with `meta`, drop the noisy `class` attribute
 * - `attr: "x"`  → element attribute `x`
 * - `html: true` → innerHTML
 * - default      → trimmed textContent
 *
 * Precedence within a match: `meta` > `attr` > `html` > text.
 *
 * @param {import("playwright").Page} page
 * @param {{ selector: string, attr?: string, all?: boolean, html?: boolean, meta?: boolean, excludeClass?: boolean }} rule
 */
async function extractRule(page, rule) {
  const read = (loc) => {
    if (rule.meta) {
      return loc.evaluate(
        (el, excludeClass) => ({
          tag: el.tagName.toLowerCase(),
          attrs: Object.fromEntries(
            [...el.attributes]
              .filter((a) => !(excludeClass && a.name === "class"))
              .map((a) => [a.name, a.value]),
          ),
          text: (el.textContent ?? "").trim() || null,
        }),
        Boolean(rule.excludeClass),
      );
    }
    if (rule.attr) return loc.getAttribute(rule.attr);
    if (rule.html) return loc.innerHTML();
    return loc.textContent().then((t) => (t == null ? null : t.trim()));
  };

  const locator = page.locator(rule.selector);
  if (rule.all) {
    const elements = await locator.all();
    return Promise.all(elements.map(read));
  }
  if ((await locator.count()) === 0) return null;
  return read(locator.first());
}

/**
 * Run one pre-extraction action against the page.
 *
 * Lets a request drive the page before scraping — e.g. log in, then navigate
 * to a guarded route. Supported `type`s:
 *
 * - `fill`             → `page.fill(selector, value)`
 * - `click`            → `page.click(selector)`
 * - `press`            → `page.press(selector, key)`
 * - `goto`             → `page.goto(url, { waitUntil })`
 * - `waitForSelector`  → `page.waitForSelector(selector)`
 * - `waitForLoadState` → `page.waitForLoadState(state)` (e.g. `networkidle`)
 * - `waitForURL`       → `page.waitForURL(url)` (glob/regex string; e.g. wait
 *                        for the post-login redirect away from `**\/login`)
 * - `waitForTimeout`   → `page.waitForTimeout(ms)` (plain sleep; last resort)
 *
 * @param {import("playwright").Page} page
 * @param {object} action
 * @param {number} timeout per-step timeout (ms)
 */
async function runAction(page, action, timeout) {
  if (!action || typeof action.type !== "string") {
    throw new Error("each action needs a `type` string");
  }
  switch (action.type) {
    case "fill":
      return page.fill(action.selector, String(action.value ?? ""), { timeout });
    case "click":
      return page.click(action.selector, { timeout });
    case "press":
      return page.press(action.selector, action.key, { timeout });
    case "goto":
      if (!/^https?:\/\//i.test(action.url ?? "")) {
        throw new Error("`goto` action needs an http(s) `url`");
      }
      return page.goto(action.url, {
        waitUntil: action.waitUntil ?? "load",
        timeout,
      });
    case "waitForSelector":
      return page.waitForSelector(action.selector, { timeout });
    case "waitForLoadState":
      return page.waitForLoadState(action.state ?? "load", { timeout });
    case "waitForURL":
      if (typeof action.url !== "string") {
        throw new Error("`waitForURL` action needs a `url` glob/regex string");
      }
      return page.waitForURL(action.url, { timeout });
    case "waitForTimeout":
      return page.waitForTimeout(Math.min(Number(action.ms) || 0, timeout));
    default:
      throw new Error(`unknown action type: ${action.type}`);
  }
}

/**
 * POST /scrape handler.
 *
 * Body:
 * ```json
 * {
 *   "url": "https://example.com",
 *   "waitUntil": "domcontentloaded",      // optional
 *   "waitForSelector": "#app",            // optional
 *   "timeout": 30000,                      // optional, ms (capped by MAX_TIMEOUT)
 *   "actions": [                           // optional, run after goto, before extract
 *     { "type": "fill", "selector": "#email", "value": "me@x.com" },
 *     { "type": "fill", "selector": "#password", "value": "secret" },
 *     { "type": "click", "selector": "button[type=submit]" },
 *     { "type": "waitForLoadState", "state": "networkidle" },
 *     { "type": "goto", "url": "https://example.com/guarded" }
 *   ],
 *   "selectors": {
 *     "title": "h1",
 *     "links": { "selector": "a", "attr": "href", "all": true }
 *   }
 * }
 * ```
 * Responds `{ url, data, tookMs }`.
 */
async function scrapeHandler(req, res) {
  const { url, selectors, waitUntil, waitForSelector, actions } = req.body ?? {};

  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "`url` must be an http(s) URL" });
  }
  if (!selectors || typeof selectors !== "object") {
    return res.status(400).json({ error: "`selectors` map is required" });
  }
  if (actions && !Array.isArray(actions)) {
    return res.status(400).json({ error: "`actions` must be an array" });
  }

  const timeout = Math.min(Number(req.body.timeout) || 30_000, MAX_TIMEOUT);

  let rules;
  try {
    rules = Object.fromEntries(
      Object.entries(selectors).map(([k, v]) => [k, normalizeRule(v)]),
    );
  } catch (err) {
    return res.status(400).json({ error: String(err.message ?? err) });
  }

  const debug = Boolean(req.body.debug);
  const wantShot = Boolean(req.body.screenshot);

  // Session reuse: load a saved login (by name or inline storageState) so this
  // request can skip the login flow; optionally capture/return it afterwards.
  const { session, saveSession, storageState, returnStorageState } = req.body;
  if (session && !sessions.has(session)) {
    return res.status(404).json({ error: `no saved session: ${session}` });
  }
  const initialState = session ? sessions.get(session) : storageState;

  const started = Date.now();
  const browser = await getBrowser();
  const context = await browser.newContext(
    initialState ? { storageState: initialState } : undefined,
  );
  const page = await context.newPage();
  /** Per-step trace, surfaced when `debug: true` (or on error). */
  const trace = [];
  try {
    await page.goto(url, { waitUntil: waitUntil ?? "load", timeout });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout });
    }
    trace.push({ step: "goto", url: page.url() });

    const list = actions ?? [];
    for (let i = 0; i < list.length; i++) {
      try {
        await runAction(page, list[i], timeout);
        trace.push({ step: i, type: list[i].type, url: page.url(), ok: true });
      } catch (err) {
        // Report which step broke + where the page was, instead of a bare 502.
        const shot = wantShot
          ? (await page.screenshot({ fullPage: true })).toString("base64")
          : undefined;
        return res.status(502).json({
          error: `action[${i}] (${list[i]?.type}) failed: ${String(err.message ?? err)}`,
          finalUrl: page.url(),
          trace,
          screenshot: shot,
        });
      }
    }

    const data = {};
    for (const [key, rule] of Object.entries(rules)) {
      data[key] = await extractRule(page, rule);
    }

    const shot = wantShot
      ? (await page.screenshot({ fullPage: true })).toString("base64")
      : undefined;

    // Capture the post-login session so the next request can skip the login.
    let savedState;
    if (saveSession || returnStorageState) {
      savedState = await context.storageState();
      if (saveSession) {
        sessions.set(saveSession, savedState);
      }
    }

    res.json({
      url,
      finalUrl: page.url(),
      data,
      tookMs: Date.now() - started,
      ...(saveSession ? { savedSession: saveSession } : {}),
      ...(returnStorageState ? { storageState: savedState } : {}),
      ...(debug ? { trace } : {}),
      ...(shot ? { screenshot: shot } : {}),
    });
  } catch (err) {
    res.status(502).json({ error: String(err.message ?? err), trace });
  } finally {
    await context.close();
  }
}

const app = express();

// Permissive CORS so a browser app on a different origin (e.g. the Tool
// Builder's Playwright Scraper node running on another localhost port) can POST
// here. Answers the preflight before any body parsing / auth runs.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.get("origin") ?? "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

// Optional auth gate: accept the key from the Bearer header or the body.
app.use((req, res, next) => {
  if (!API_KEY) return next();
  if (req.path === "/health") return next();
  const header = (req.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const bodyKey = req.body?.apiKey ?? "";
  if (header !== API_KEY && bodyKey !== API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.post("/scrape", scrapeHandler);

const server = app.listen(PORT, () => {
  console.log(`[scrape-server] listening on :${PORT}`);
});

/** Close the browser + server cleanly on shutdown. */
async function shutdown() {
  console.log("[scrape-server] shutting down");
  server.close();
  if (browserPromise) await (await browserPromise).close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
