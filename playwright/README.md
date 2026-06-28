# E2E Tests (Playwright)

Self-contained Playwright suite for the toolkits app. Has its own
`package.json` — independent of the root pnpm workspace.

## Layout

```text
playwright/
  package.json              # test runner + scrape-server deps
  playwright.config.ts       # BASE_URL-driven, chromium/firefox/webkit
  tests/                     # *.spec.ts
  server/scrape-server.mjs   # dynamic scrape API (Express + Playwright)
```

## Run tests

```bash
cd playwright
pnpm install
pnpm exec playwright install   # browsers (first run only)

# point at a running app
BASE_URL=http://localhost:3000 pnpm test
```

Other scripts: `pnpm test:ui`, `pnpm test:headed`, `pnpm report`, `pnpm codegen`.

## Dynamic scrape API

A standalone Express + Playwright server. POST a URL plus a map of extraction
rules; get back the scraped data. One shared Chromium, fresh context per
request. **Full guide: [SCRAPE.md](./SCRAPE.md).**

### Run

```bash
cd playwright
pnpm install
pnpm serve               # http://localhost:3001
```

### Endpoints

- `GET /health` → `{ "ok": true }`
- `POST /scrape` → `{ url, data, tookMs }`

### Request body

```json
{
  "url": "https://example.com",
  "waitUntil": "domcontentloaded",
  "waitForSelector": "#app",
  "timeout": 30000,
  "selectors": {
    "title": "h1",
    "intro": { "selector": "p", "html": true },
    "links": { "selector": "a", "attr": "href", "all": true }
  }
}
```

`waitForSelector` is optional — only set it to an element that actually exists
on the page, or the request waits out `timeout` and fails.

Rule forms:

| Form                                  | Returns                          |
| ------------------------------------- | -------------------------------- |
| `"h1"` (string shorthand)             | trimmed textContent of 1st match |
| `{ "selector": "a", "attr": "href" }` | that attribute                   |
| `{ "selector": "p", "html": true }`   | innerHTML                        |
| `{ "selector": "li", "all": true }`   | array over every match           |

### Example

```bash
curl -s localhost:3001/scrape \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","selectors":{"title":"title","links":{"selector":"a","attr":"href","all":true}}}'
```

### Auth

Set `API_KEY` to require a key on every request (`/health` stays open). Supply
it either as a header or in the JSON body:

```jsonc
// header
"Authorization": "Bearer <key>"
// or body
{ "apiKey": "<key>", "url": "...", "selectors": { } }
```

Cap request runtime with `MAX_TIMEOUT` (ms).

## Notes

- `CI=true` enables retries + single-worker determinism (see config).
