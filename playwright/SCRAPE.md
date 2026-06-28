# Scrape API

A small HTTP service that drives a real Chromium browser (Playwright) to load a
page and pull values out of it with CSS selectors. You send it a URL plus a map
of "what to grab", and it returns the grabbed data as JSON.

Source: [`server/scrape-server.mjs`](./server/scrape-server.mjs).

---

## How it works

- One long-lived Chromium browser is launched on the **first** request and
  reused after that (fast — no per-request browser startup).
- Each request gets its own **fresh, isolated browser context** (no shared
  cookies/storage between requests), which is closed when the request finishes.
- Because it's a real browser, JavaScript-rendered pages (React/SPAs) work —
  unlike a plain `fetch` of the HTML.

---

## Running the server

```bash
cd playwright
pnpm install                          # once
pnpm exec playwright install chromium # once — downloads the browser
pnpm serve                            # starts the server (default :3001)
```

You should see:

```
[scrape-server] listening on :3001
```

### Environment variables

| Var           | Default | Meaning                                                         |
| ------------- | ------- | --------------------------------------------------------------- |
| `PORT`        | `3001`  | Port the server listens on.                                     |
| `API_KEY`     | _(off)_ | If set, every request must present this key (see[Auth](#auth)). |
| `MAX_TIMEOUT` | `60000` | Hard cap (ms) on a request's`timeout`, regardless of payload.   |

Example: `API_KEY=secret PORT=4000 pnpm serve`

---

## Endpoints

### `GET /health`

Liveness probe. No auth required.

```bash
curl localhost:3001/health
# {"ok":true}
```

### `POST /scrape`

Run an extraction. Send JSON, get JSON back.

---

## Request body

```json
{
  "url": "https://example.com",
  "waitUntil": "load",
  "waitForSelector": "#app",
  "timeout": 30000,
  "selectors": {
    "title": "title",
    "links": { "selector": "a", "attr": "href", "all": true }
  }
}
```

| Field             | Required | Type   | Default  | Notes                                                                                                                                                       |
| ----------------- | -------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`             | **yes**  | string | —        | Must start with`http://` or `https://`.                                                                                                                     |
| `selectors`       | **yes**  | object | —        | Map of`outputKey → rule`. See [Selector rules](#selector-rules).                                                                                            |
| `waitUntil`       | no       | string | `"load"` | When`goto` resolves: `load`, `domcontentloaded`, `networkidle`, or `commit`.                                                                                |
| `waitForSelector` | no       | string | —        | Wait until this element appears before scraping.**Only set it if the element really exists** — otherwise the request waits out `timeout` and fails.         |
| `timeout`         | no       | number | `30000`  | Per-step timeout in ms (navigation + waits). Capped by`MAX_TIMEOUT`.                                                                                        |
| `actions`         | no       | array  | —        | Steps run**after** `goto`, **before** extraction — drive the page (log in, then navigate to a guarded route). See [Actions](#actions-login--guarded-pages). |
| `apiKey`          | no       | string | —        | Auth key, if you prefer body over header (see[Auth](#auth)).                                                                                                |

### `waitUntil` — which to pick

| Value              | Resolves when…                  | Use for                        |
| ------------------ | ------------------------------- | ------------------------------ |
| `domcontentloaded` | HTML parsed (fastest)           | Static / server-rendered pages |
| `load`             | `load` event (images, css done) | Default, safe                  |
| `networkidle`      | No network activity for 500ms   | SPAs / lazy-loaded content     |

---

## Actions (login / guarded pages)

The server is **stateless per request** — no session is carried between calls.
To scrape a page behind a login, do the whole flow in **one** request: start at
the login page (`url`), drive it with `actions`, then `goto` the guarded route,
then extract with `selectors`.

`actions` is an array of steps run in order, **after** `goto(url)` and **before**
extraction. Each step is `{ "type": …, … }`:

| `type`             | Fields                       | Does                                                       |
| ------------------ | ---------------------------- | ---------------------------------------------------------- |
| `fill`             | `selector`, `value`          | Type`value` into the field.                                |
| `click`            | `selector`                   | Click the element.                                         |
| `press`            | `selector`, `key`            | Press a key (e.g.`"Enter"`) on the element.                |
| `goto`             | `url`, `waitUntil?`          | Navigate to another http(s) URL.                           |
| `waitForSelector`  | `selector`                   | Wait until the element appears.                            |
| `waitForLoadState` | `state` (e.g. `networkidle`) | Wait for a page load state.                                |
| `waitForURL`       | `url` (glob/regex)           | Wait until the URL matches — e.g. the post-login redirect. |
| `waitForTimeout`   | `ms`                         | Plain sleep (capped by`timeout`). Last resort.             |

Every step uses the request `timeout`. Pass `"debug": true` for a per-step
`trace` (each step's type + URL); pass `"screenshot": true` for a full-page PNG
as base64. On an action error the response is `502` with the **failing step
index**, `finalUrl`, and the `trace` — so you see exactly where it broke. The
success response also includes `finalUrl` so you can confirm the login landed.

### Example — log in, then scrape a guarded page

> **Gotcha for `faculty.rotutia.dev`:** the email/password "fields" are
> clickable `<div>`s — you must **click** each one first; the click swaps it
> into a real `<input>` carrying the same `data-test`. Then `fill` it. And
> sign-in is **async** — after clicking sign-in, wait for the redirect **away
> from** `/login` before navigating, or you race back to the login page.

```json
{
  "url": "https://faculty.rotutia.dev/login",
  "waitUntil": "networkidle",
  "actions": [
    { "type": "click", "selector": "[data-test=input-email]" },
    {
      "type": "fill",
      "selector": "[data-test=input-email]",
      "value": "me@example.com"
    },
    { "type": "click", "selector": "[data-test=input-password]" },
    {
      "type": "fill",
      "selector": "[data-test=input-password]",
      "value": "secret"
    },
    { "type": "click", "selector": "[data-test=button-sign-in]" },
    { "type": "waitForURL", "url": "**/manage-course**" },
    { "type": "waitForLoadState", "state": "networkidle" }
  ],
  "selectors": {
    "elements": {
      "selector": "[data-test]",
      "meta": true,
      "excludeClass": true,
      "all": true
    }
  }
}
```

The app auto-redirects to `/manage-course` after login, so `waitForURL` lands
there directly — no explicit `goto` needed. For a _different_ guarded route,
wait for the redirect away from login first, then `goto` it:

```json
{ "type": "waitForURL", "url": "https://faculty.rotutia.dev/**" },
{ "type": "goto", "url": "https://faculty.rotutia.dev/some-other-page" }
```

---

## Sessions — log in once, reuse it

Each request is isolated, so by default you log in **every** time. To avoid
that, capture the logged-in session (cookies + localStorage) once and reuse it.

| Field                | Type    | Direction | Notes                                                                                        |
| -------------------- | ------- | --------- | -------------------------------------------------------------------------------------------- |
| `saveSession`        | string  | request   | After the actions succeed, store the session under this name (server memory).                |
| `session`            | string  | request   | Reuse a previously saved session by name — **skip the login actions**. `404` if unknown.     |
| `returnStorageState` | boolean | request   | Also return the captured `storageState` in the response (portable; survives restart).        |
| `storageState`       | object  | both      | Pass a previously returned `storageState` to reuse it inline (instead of a named `session`). |

Named sessions live in **server memory** and are cleared on restart. For
persistence across restarts, use `returnStorageState` + pass `storageState` back
in later requests.

### Step 1 — log in and save the session

Run the full login flow once, add `"saveSession": "faculty"`:

```json
{
  "url": "https://faculty.rotutia.dev/login",
  "waitUntil": "networkidle",
  "saveSession": "faculty",
  "actions": [
    { "type": "click", "selector": "[data-test=input-email]" },
    {
      "type": "fill",
      "selector": "[data-test=input-email]",
      "value": "me@example.com"
    },
    { "type": "click", "selector": "[data-test=input-password]" },
    {
      "type": "fill",
      "selector": "[data-test=input-password]",
      "value": "secret"
    },
    { "type": "click", "selector": "[data-test=button-sign-in]" },
    { "type": "waitForURL", "url": "**/manage-course**" },
    { "type": "waitForSelector", "selector": "[data-test=page-title]" }
  ],
  "selectors": { "title": "[data-test=page-title]" }
}
```

Response includes `"savedSession": "faculty"`.

### Step 2 — reuse it, no login

Pass `"session": "faculty"` and go **straight** to any guarded page — no login
actions needed:

```json
{
  "url": "https://faculty.rotutia.dev/settings",
  "waitUntil": "networkidle",
  "session": "faculty",
  "actions": [{ "type": "waitForSelector", "selector": "[data-test]" }],
  "selectors": {
    "ids": { "selector": "[data-test]", "attr": "data-test", "all": true }
  }
}
```

> SPA caveat still applies: the page renders after `networkidle`, so keep a
> `waitForSelector` on a known post-render element before extraction.

---

## Selector rules

Each entry in `selectors` maps an **output key** (you choose the name) to a
**rule** describing what to extract. Two forms:

### Shorthand (string)

The value is a CSS selector; you get the trimmed text of the **first** match.

```json
{ "selectors": { "heading": "h1" } }
```

→ `"heading": "Welcome"`

### Full (object)

```json
{ "selector": "a", "attr": "href", "all": true, "html": false }
```

| Key            | Type    | Effect                                                                         |
| -------------- | ------- | ------------------------------------------------------------------------------ |
| `selector`     | string  | **Required.** The CSS selector.                                                |
| `all`          | boolean | `true` → return an **array** over every match (else first only).               |
| `meta`         | boolean | `true` → return `{ tag, attrs, text }` (tag name + **all** attributes + text). |
| `excludeClass` | boolean | With`meta`, drop the noisy `class` attribute from `attrs`.                     |
| `attr`         | string  | Return this**attribute** (e.g. `href`, `src`) instead of text.                 |
| `html`         | boolean | `true` → return `innerHTML` instead of text.                                   |

Precedence within a match: `meta` > `attr` > `html` > text.

### Rule cheat-sheet

| Rule                                                       | Returns                               |
| ---------------------------------------------------------- | ------------------------------------- |
| `"h1"`                                                     | text of first`<h1>`                   |
| `{ "selector": "a", "attr": "href" }`                      | `href` of first link                  |
| `{ "selector": "a", "attr": "href", "all": true }`         | array of every link's`href`           |
| `{ "selector": "p", "html": true }`                        | innerHTML of first`<p>`               |
| `{ "selector": "li", "all": true }`                        | text of every`<li>`                   |
| `{ "selector": "[data-test]", "meta": true, "all": true }` | `{ tag, attrs, text }` of every match |

A selector that matches nothing returns `null` (or `[]` when `all: true`).

---

## Response

### Success — `200`

```json
{
  "url": "https://example.com",
  "data": {
    "title": "Example Domain",
    "links": ["https://www.iana.org/domains/example"]
  },
  "tookMs": 412
}
```

`data` mirrors your `selectors` map key-for-key.

### Errors

| Status | When                                                                                        |
| ------ | ------------------------------------------------------------------------------------------- |
| `400`  | Bad input — missing/invalid`url`, missing `selectors`, bad rule.                            |
| `401`  | `API_KEY` is set and the key was missing/wrong.                                             |
| `502`  | Navigation/extraction failed (timeout, DNS,`waitForSelector` never appeared, page crashed). |

Error shape: `{ "error": "<message>" }`.

---

## Auth

Auth is **off** unless `API_KEY` is set on the server. When set, every request
(except `/health`) must present the key, either way:

```jsonc
// Header
"Authorization": "Bearer <key>"

// or body field
{ "apiKey": "<key>", "url": "...", "selectors": { } }
```

Wrong/missing → `401 unauthorized`.

---

## Examples

### curl

```bash
curl -s localhost:3001/scrape \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://faculty.rotutia.dev/login",
    "waitUntil": "networkidle",
    "selectors": {
      "title": "title",
      "links": { "selector": "a", "attr": "href", "all": true }
    }
  }'
```

### JavaScript (fetch)

```js
const res = await fetch("http://localhost:3001/scrape", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: "https://example.com",
    selectors: {
      title: "title",
      links: { selector: "a", attr: "href", all: true },
    },
  }),
});
const { data } = await res.json();
```

### Python (requests)

```python
import requests

r = requests.post("http://localhost:3001/scrape", json={
    "url": "https://example.com",
    "selectors": {
        "title": "title",
        "links": {"selector": "a", "attr": "href", "all": True},
    },
})
print(r.json()["data"])
```

### Postman

1. `POST` → `http://localhost:3001/scrape`
2. **Body** → **raw** → **JSON**, paste a request body from above.
3. If `API_KEY` is set: **Authorization** tab → **Bearer Token**, or add
   `"apiKey"` to the body.
4. **Send**.

---

## Tips & gotchas

- **Don't set `waitForSelector` to something that isn't on the page** — it's the
  #1 cause of a 30s hang ending in `502`. Leave it out unless you know the
  element exists.
- Text comes back **trimmed**; use `html: true` if you need raw markup.
- SPAs: prefer `waitUntil: "networkidle"` (or a `waitForSelector` on a known
  post-render element) so content has rendered before extraction.
- The server is **stateless per request** — no login/session is carried between
  calls. Auth'd scraping (cookies, login flow) isn't supported by this endpoint.
- Returns `null` / `[]` for non-matches rather than erroring, so a typo'd
  selector fails quietly — eyeball the response keys.

```

```
