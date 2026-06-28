# Project Structure — File Placement Rules

Last updated: 2026-06-29

Where each file type lives. Next.js 16 App Router + TypeScript.

```text
<project>/
  src/
    app/              # ROUTES ONLY
    components/       # SHARED UI
    features/         # FEATURE MODULES
    stores/           # REDUX
    providers/        # CLIENT PROVIDERS
    hooks/            # SHARED HOOKS
      mutation/       # TANSTACK MUTATION HOOKS
      query/          # TANSTACK QUERY HOOKS
    lib/              # FRAMEWORK-AGNOSTIC HELPERS
    schemas/          # ZOD SCHEMAS
    constants/        # STATIC VALUES
    types/            # SHARED TS TYPES
    styles/           # CSS + STYLE BUILDERS
    prompts/          # AI PROMPT FILES
  public/             # STATIC ASSETS (svg, png, ico)
```

---

## src/app/ — Routes only

| File                | Goes in                                        |
| ------------------- | ---------------------------------------------- |
| Root layout         | `src/app/layout.tsx`                           |
| Root error boundary | `src/app/error.tsx`                            |
| 404 page            | `src/app/not-found.tsx`                        |
| Favicon             | `src/app/favicon.ico`                          |
| Public route page   | `src/app/(full-frame-public)/<name>/page.tsx`  |
| Private route page  | `src/app/(menu-frame-private)/<name>/page.tsx` |
| Route group layout  | `src/app/(<group>)/layout.tsx`                 |
| Dynamic route       | `src/app/<group>/<name>/[param]/page.tsx`      |
| Optional catch-all  | `src/app/<group>/<name>/[[...slug]]/page.tsx`  |
| Catch-all route     | `src/app/<group>/<name>/[...slug]/page.tsx`    |
| API handler         | `src/app/api/<endpoint>/route.ts`              |
| API shared helper   | `src/app/api/api.ts`                           |

Rule: `page.tsx` is a thin shell that mounts one feature. No markup, no fetching.

### Current routes

- `app/layout.tsx` — root layout (fonts + `@/styles/globals.css`)
- `app/page.tsx` — home page `/` (thin shell, mounts `ToolBuilder` feature)
- `app/favicon.ico`

- `app/(full-frame-public)/login/page.tsx` — `/login` route (thin shell, mounts `AuthLogin` feature)
- `app/(full-frame-public)/privacy/page.tsx` — `/privacy` route (thin shell, mounts `Legal` with `doc="privacy"`; public, no auth — the proxy whitelists `/privacy`)
- `app/(full-frame-public)/terms/page.tsx` — `/terms` route (thin shell, mounts `Legal` with `doc="terms"`; public, no auth — the proxy whitelists `/terms`)
- `app/(full-frame-public)/[toolId]/page.tsx` — `/<uuid>` share route (thin shell, mounts `SharedToolView` feature; public, no auth required)
- `app/(full-frame-public)/g/[handle]/page.tsx` — `/g/<handle>` public gallery route (+ `loading.tsx`; thin shell + `generateMetadata`, mounts `PublicGallery`; public, no auth — the proxy whitelists `/g/*`). The static `g` segment takes priority over the `[toolId]` dynamic at the same level.
- `app/gallery/page.tsx` — `/gallery` private route (thin shell, mounts the `Gallery` manager; auth-gated by the proxy)
- `app/api/gallery/[handle]/route.ts` — public gallery data endpoint. Resolves a published gallery by handle under anon RLS and returns its visible tool cards; the owner id is resolved server-side and never serialised. The proxy whitelists `/api/gallery/*`.

- `app/docs/layout.tsx` — docs section shell (mounts `DocsShell` from the `NodeDocs` feature: topbar + `prose` column)
- `app/docs/nodes/page.mdx` — `/docs/nodes` MDX page. Authored prose + `<NodeDocs />` (the generated node-type reference). MDX is enabled via `next.config.ts` (`createMDX` + `pageExtensions`) and styled globally by `src/mdx-components.tsx`.

**MDX**: `.md`/`.mdx` files are routable pages. The root `src/mdx-components.tsx` (`@next/mdx` requirement) maps generated HTML to the neobrutalism design system. Docs pages wrap their content in `prose`; interactive React components mounted inside MDX opt out with `not-prose`.

> **Example usage** (target convention, not yet present):
>
> - Public: `app/(full-frame-public)/login/[[...path]]/page.tsx`
> - Private: `app/(menu-frame-private)/organizations/page.tsx`
> - API: `app/api/<endpoint>/route.ts` + `app/api/api.ts` (shared helper)
> - API route handlers that touch backend resources resolve the org by **slug**, never the raw organization id (see root rule: org id never on the wire).

---

## src/features/ — Feature modules

| File                            | Goes in                                            |
| ------------------------------- | -------------------------------------------------- |
| Feature entry component         | `src/features/<FeatureName>/<FeatureName>.tsx`     |
| Feature barrel (public surface) | `src/features/<FeatureName>/index.ts`              |
| Feature sub-component (private) | `src/features/<FeatureName>/components/<Name>.tsx` |

Rule: folder name == entry file name (PascalCase). Each feature exposes an
`index.ts` barrel; cross-feature imports go through the barrel
(`@/features/<Name>`), never into another feature's internal files. Truly
private parts may stay in a local `components/` folder; a part reused by more
than one feature is promoted to its own feature folder.

### Current features

The Tool Builder is split into a thin **orchestrator feature** plus one feature
per UI panel. Each feature is UI-only; the shared domain (slice, hook, types,
catalog, runtime) lives in the shared dirs and is imported via `@/...` aliases.

- `AuthLogin/` — login + sign-up form. Server actions (`signIn`, `signUp`,
  `signOut`) live in `AuthLogin/actions.ts` (exported via barrel). Mounted by
  `app/(full-frame-public)/login/page.tsx`.
- `ToolBuilder/` — orchestrator. Composes the panel features into the
  three-panel workspace; mounted by `app/page.tsx`. Calls `useToolsSync` on
  mount to hydrate the Redux slice from Supabase.
  - `index.ts` — barrel: re-exports the `ToolBuilder` component
  - `ToolBuilder.tsx` — entry component; composes the panel features. Owns the center view (builder vs chat) + side-panel visibility: the chat tab hides both side panels, the build tab restores them, and per-panel toggle buttons (PanelLeft / PanelRight) in the builder header hide/show Tools + Node independently. A selected node's editor always opens in the right (Node) panel.
- `Topbar/` — tool name + count header
- `ToolsPanel/` — left tools list + search. Each row shows the tool's icon (`@/components/customs/ToolIcon` renders the sanitized per-tool SVG, falling back to a default glyph). The per-row options menu exposes "Edit icon" — a dialog with a live preview, an SVG-code textarea, and an "AI generate" button (`@/lib/generate-tool-icon`, draws an icon from the tool's node chain) — plus the gallery actions "Add to / Remove from gallery" (toggles `tools.in_gallery`) and "Make public / private" (toggles `tools.is_shared`), wired through `@/hooks/useGallery`.
- `BuilderPanel/` — center node-chain builder; composes `NodeCard` + `PreviewPane` features. A header segmented control toggles the center view between the node builder and a chat surface (the node editor always opens in the right panel — there is no inline placement). The canvas is a direct-manipulation editor: every connector gap (and the chain end / empty state) carries a `NodeInserter`; nodes drag-reorder with a floating `DragOverlay` preview; and when a card is focused the canvas takes keyboard shortcuts — ↑/↓ move the selection, Backspace/Delete removes the node, ⌘/Ctrl+D duplicates it (the State Control is exempt).
  - `components/NodeInserter.tsx` — feature-private inline quick-add. Opens a searchable cmdk picker (`@/components/ui/command` in a `popover`) over the node catalog (`PALETTE_GROUPS` / `NODE_META`) and inserts the chosen type at an exact chain position via `useToolBuilder.insertNode` — the precise-placement path that replaces "append from the right palette, then drag up". Variants: `gap` (hover `+` on a connector), `end` (dashed Add-node button), `empty` (first-node CTA).
  - `components/ChatView.tsx` — feature-private ChatGPT-style chat assistant. Calls the chosen provider (Gemini / OpenRouter; keys via the AI-keys popover in `ToolsPanel`) with a system prompt from `buildChatSystemPrompt` (`@/constants/ai-prompts`) + `buildChatToolContext` (`@/lib/chat-context`) — the open tool's connected node chain, the node catalog, docs for the node types in use, and the exact config schema of every node type. **No function calling.** Building is one-shot: a build request first yields a plan (recovered from the reply via `extractPlanFromText`); once the user approves in chat, the next turn returns the COMPLETE tool as a single JSON build spec (`parseBuildSpec`) that's applied atomically via `applyBuildSpec` (one Redux dispatch), then `validateTool` surfaces any dead wires for the review/fix card. Provider/model pickers, plan/build/review cards, thinking indicator, error + retry. Shown when the "chat" tab is active.
- `NodeCard/` — single node row; composes the `NodeEditor` feature
- `NodeEditor/` — node config form (shared by `NodeCard` and `ToolBuilder`)
- `PalettePanel/` — right "Node" panel
- `PreviewPane/` — live preview renderer
  - `components/DataTable.tsx` — Table-node renderer (TanStack Table + Virtual: kind-aware sorting, column resizing, 30/50/100 pagination)
  - `components/ChartView.tsx` — Chart-node renderer (d3: bar/line/area/pie/scatter over normalized array data)
  - `components/SpriteView.tsx` — Sprite-node renderer (flip-book animation over a bound frame array / sprite sheet)
  - `components/VaultView.tsx` — Vault-node renderer (read-only key/value detail view with optional value masking)
  - `components/IdentityView.tsx` — Identity-node renderer (read-only JSON sample of the faker-generated records + a record-count badge; computes the same array as the runtime via `@/lib/generate-identity`)
  - `components/MermaidView.tsx` — Mermaid (Diagram) node renderer (renders the bound state slot's Mermaid definition to SVG via dynamically-imported `mermaid` at `securityLevel: "strict"`; inline error/empty states)
  - `components/HighlightView.tsx` — Highlight (Code View) node renderer (syntax-highlights the bound code string via dynamically-imported `shiki`; language/theme from the node, optional line-number gutter via the `.shiki-lines` CSS in `globals.css`, copy button)
  - `components/QrCodeView.tsx` — QR Code node renderer (encodes the bound string to crisp SVG via dynamically-imported `qrcode`; size + error-correction level from the node)
  - `components/TtsView.tsx` — Text to Speech node renderer (speaks the bound state string aloud via `react-text-to-speech`'s `useSpeech` browser Speech-Synthesis hook; play/pause/stop controls, rate/pitch/volume + optional word highlighting from the node; never writes to state)
  - `components/SttView.tsx` — Speech to Text node renderer (transcribes the microphone via `react-speech-recognition`'s `useSpeechRecognition` browser Speech-Recognition hook; record/stop control + live transcript, language/continuous from the node; WRITES the transcript back to the bound state slot through an `onChange` handler supplied by `PreviewPane`)
- `SharedToolView/` — public share view. Fetches a shared tool via `/api/shared/[toolId]` and renders only `PreviewPane`. No builder UI. Mounted by `app/(full-frame-public)/[toolId]/page.tsx`.
- `Gallery/` — signed-in gallery manager. Configures the user's public gallery (handle, title, description, master public toggle) and lists every tool with its membership + public/private controls. All state goes through `@/hooks/useGallery` (Supabase, outside the Tool Builder save cycle). Mounted by `app/gallery/page.tsx`.
  - `components/GalleryToggle.tsx` — feature-private neobrutalist on/off switch (mirrors `Settings/components/SettingToggle`).
- `PublicGallery/` — public gallery card grid. Fetches `/api/gallery/[handle]`, renders tool cards (icon + name) that link to each tool's public preview (`/<toolId>`). No auth, no builder UI, no owner identity. Mounted by `app/(full-frame-public)/g/[handle]/page.tsx`.
- `Settings/` — user settings. Exposes `SettingsButton` (gear trigger + dialog) mounted in `Topbar`. Renders the available-settings catalog (`@/constants/settings`); reads/writes via `@/hooks/useAppConfig`. Persistence + theme application live in `@/providers/AppConfigProvider`.
  - `components/SettingToggle.tsx` — feature-private on/off switch.
- `NodeDocs/` — docs section. `NodeDocs` renders the node-type reference catalogue from `@/lib/node-catalog` (`getNodeCatalog()`) + `@/constants/tool-builder` (icons/accents), localized via `useTranslation` so it stays in lockstep with the in-app palette. Mounted by `app/docs/nodes/page.mdx`. Each card is a button that opens the detail dialog; the selected node is mirrored to the URL hash (`#node-<type>`) for deep-linking.
  - `components/DocsShell.tsx` — feature-private `/docs` topbar + `prose` wrapper; mounted by `app/docs/layout.tsx`. The `Topbar` "Docs" link points here.
  - `components/NodeDetailDialog.tsx` — feature-private modal showing one node's full reference (summary, config, state I/O, tips, example) from `@/constants/node-docs`; chrome localized, body is the English content layer.
- `Legal/` — public legal pages. `Legal` (entry) takes a `doc: "privacy" | "terms"` prop and renders the matching document inside the shared `LegalShell` (own header/footer, reachable logged-out). Mounted by the thin shells at `app/(full-frame-public)/privacy/page.tsx` and `.../terms/page.tsx`. English-only (matches the marketing landing page; no `t()`), no governing-law clause. Cross-linked from the landing footer + the login form + the studio Settings dialog.
  - `components/LegalShell.tsx` — feature-private chrome: sticky topbar (brand → home, theme toggle, GitHub, back-to-Studio) + `prose` column + footer that cross-links both documents.
  - `components/PrivacyContent.tsx` / `components/TermsContent.tsx` — feature-private English prose bodies (semantic HTML only; styled by the shell's `prose` wrapper). Keep `PrivacyContent` in sync with how the app stores data (Supabase account/tools, browser-local prefs + AI keys).

Tool Builder shared domain (consumed by the features above):
`@/stores/slices/toolBuilderSlice` (state), `@/hooks/useToolBuilder` (state/actions
access point), `@/types/tool-builder` (types + `isRenderNode`),
`@/constants/tool-builder` (node catalog, `createNode()`, `uuid()`),
`@/lib/tool-builder-runtime` (pure preview helpers).

> **Example usage** (target convention):
>
> - `src/features/AuthLogin/AuthLogin.tsx` — entry component
> - `src/features/AuthLogin/index.ts` — barrel re-exporting the public surface
> - `src/features/AuthLogin/components/AuthLoginForm.tsx` — feature-private sub-component

---

## src/components/ — Shared UI

| File                         | Goes in                                    |
| ---------------------------- | ------------------------------------------ |
| shadcn/ui primitive          | `src/components/ui/<kebab-name>.tsx`       |
| Custom variant wrapper       | `src/components/customs/<Name>Varient.tsx` |
| Composite input              | `src/components/customs/<Name>.tsx`        |
| Domain alert / shared widget | `src/components/customs/<Name>.tsx`        |
| SVG icon component           | `src/components/icons/<Name>Icon.tsx`      |

Rule: `ui/` is lowercase-kebab. `customs/` and `icons/` are PascalCase.

### Current components

**ui/** — `button` (shadcn/ui, new-york style, neutral base). `markdown.tsx` — shared `Markdown` renderer (react-markdown + GFM/math/highlight, sanitized; caller wraps in `prose`). Single source for Markdown across the `markdown` input node, AI Markdown output (`PreviewPane`), and the Builder chat assistant (`ChatView`).

**customs/** — `ClickBurst.tsx` — global pointer click-burst effect (neobrutalism square ring + sparks, spring physics via `motion`/framer-motion). Mounted once in `app/layout.tsx`; portals a fixed pointer-events-none overlay. No-ops under reduced motion. `ToolIcon.tsx` — renders a tool's icon, re-sanitizing its SVG (`sanitizeSvgIcon`) on every render and falling back to a `Package` glyph; shared by `ToolsPanel`, `Gallery`, and `PublicGallery`.

> **Example usage** (target convention):
>
> - **ui/** — `src/components/ui/button.tsx` (shadcn/ui primitive, kebab-case)
> - **customs/** — `src/components/customs/ButtonVarient.tsx`, `src/components/customs/InputText.tsx` (PascalCase)
> - **icons/** — `src/components/icons/MailIcon.tsx` (PascalCase)

---

## src/stores/ — Redux Toolkit

| File                 | Goes in                            |
| -------------------- | ---------------------------------- |
| Store config + types | `src/stores/store.ts`              |
| Typed hooks          | `src/stores/hooks.ts`              |
| Slice                | `src/stores/slices/<name>Slice.ts` |

Rule: one slice per state concern. File name `<feature><Concern>Slice.ts`.

### Current store

- `store.ts` — `makeStore()` factory (per-request store) + `RootState`/`AppDispatch`/`AppStore` types. Registers each slice in its `reducer` map.
- `hooks.ts` — typed `useAppDispatch`, `useAppSelector`, `useAppStore`
- `slices/appConfigSlice.ts` — global `appConfig` / user settings (theme, locale, sidebarCollapsed, reducedMotion, autoSave, confirmBeforeDelete, hydrated). Accessed via `@/hooks/useAppConfig`; persisted + applied by `@/providers/AppConfigProvider`. Mounted via `StoreProvider` in `src/app/layout.tsx`
- `slices/toolBuilderSlice.ts` — Tool Builder state (tools, selection, search, loadState). Mounted at `state.toolBuilder`; never read directly — go through `@/hooks/useToolBuilder`. Exports `hydrateTools` + `setLoadState` for the sync hook. `applyBuildSpec` rebuilds the open tool's whole node chain from a chat-assistant `BuildSpec` in one atomic dispatch — fresh State Control from `slots`, then each node from `createNode` defaults + the spec's config patch, with fresh ids deep-assigned, any slot a node binds to auto-created, and Button/Text run `targets`/`resetTargets` resolved from each node's model-assigned `ref` label (or 1-based position) to the generated node id. `duplicateTool` clones a tool in place (fresh node ids, regenerated nested item ids, run targets remapped to the copy's nodes, name suffixed " copy"); `duplicateNode` clones one node right after the original (fresh ids; the State Control is never duplicated). `insertNode({ type, index })` drops a new node at an exact chain position (clamped) and selects it — the precise-placement counterpart to `addNode` (append), used by the builder canvas' inline `NodeInserter`s; both share the single-State-Control rule (a second `state` re-selects the existing one).

> **Slice ownership**: all state slices live in `src/stores/slices/`. Components never read slices directly — they go through a hook in `src/hooks/` (see the hooks rule). Tool Builder's state is shared by every panel feature, so its slice + access hook are shared, not co-located in one feature.
>
> **Example usage** (target convention): `src/stores/slices/authLoginSlice.ts`

---

## src/providers/ — Client providers

| File                         | Goes in                                |
| ---------------------------- | -------------------------------------- |
| Redux provider wrapper       | `src/providers/StoreProvider.tsx`      |
| TanStack Query provider      | `src/providers/QueryProvider.tsx`      |
| Permission context provider  | `src/providers/PermissionProvider.tsx` |
| Other React context provider | `src/providers/<Name>Provider.tsx`     |

Rule: all `"use client"`. Composed in `src/app/layout.tsx`.

### Current providers

- `StoreProvider.tsx` — Redux store provider (per-request store via `useRef`)
- `QueryProvider.tsx` — TanStack Query provider (ref-stable `QueryClient`)
- `AppConfigProvider.tsx` — hydrates `appConfig` from localStorage, applies theme (`.dark` + `color-scheme`, tracking the OS preference while `system`), reflects reduced-motion/locale onto `<html>`, and mirrors settings back to localStorage. Composed inside `StoreProvider` in `src/app/layout.tsx`.

---

## src/hooks/ — Shared React hooks

| File                             | Goes in                            |
| -------------------------------- | ---------------------------------- |
| Reusable hook used by >1 feature | `src/hooks/use<Name>.ts`           |
| TanStack Query hook (shared)     | `src/hooks/query/use<Name>.tsx`    |
| TanStack Mutation hook (shared)  | `src/hooks/mutation/use<Name>.tsx` |

Rule: feature-only hooks stay inside feature folder, not here. Query/mutation hooks organized in subdirectories.

### Current hooks

- `useToolBuilder.ts` — single access point for Tool Builder state + actions (reads `state.toolBuilder`, returns derived values + bound dispatchers). All panel features use it; components never touch the slice or `useAppSelector` directly.
- `useAuth.ts` — returns `{ user, loading }` for the signed-in Supabase user; subscribes to `onAuthStateChange`.
- `useToolsSync.ts` — fetches tools + nodes from Supabase via TanStack Query and dispatches `hydrateTools` into the Redux slice on mount. Called once at the top of `ToolBuilder`.
- `useAppConfig.ts` — single access point for global app config / user settings (`state.appConfig`): returns current values + bound setters (incl. catalog-driven `setToggle`). Used by `Settings` and `AppConfigProvider`; components never read the slice directly.
- `useTranslation.ts` — returns `t(key)` resolving `@/constants/i18n` strings for the active locale (from `useAppConfig`), with `en` fallback. Used by any feature rendering user-facing text (`Topbar`, `Settings`).
- `useChatModelPref.ts` — global per-user Builder-chat model selection, persisted on `profiles.chat_provider` / `chat_model` (one choice across all tools). TanStack Query read + optimistic `save` (Supabase update). Falls back to `gemini` / app-default model. Used by the `BuilderPanel` chat view.
- `useGallery.ts` — single access point for the signed-in user's gallery: get-or-create the `galleries` row (handle/title/description/`is_public`), the owner's tools with their gallery flags (`flagsById`), and bound mutations (`updateGallery` — surfaces `HANDLE_TAKEN`/`HANDLE_INVALID`; `setToolInGallery`/`setToolShared`). TanStack Query/Mutation over Supabase, scoped to `owner_id` so the permissive public-read RLS can't leak other users' rows. Flags live OUTSIDE the Tool Builder slice + its save cycle. Used by `Gallery` + `ToolsPanel`.

> **Example usage** (target convention):
>
> - `src/hooks/useScrollLock.ts` — shared hook
> - `src/hooks/query/useOrganizationTree.tsx` — TanStack Query hook
> - `src/hooks/mutation/useAuthLogin.tsx` — TanStack Mutation hook

---

## src/lib/ — Framework-agnostic helpers

| File                    | Goes in             |
| ----------------------- | ------------------- |
| Axios client + ApiError | `src/lib/axios.ts`  |
| `cn()` class-merge util | `src/lib/utils.ts`  |
| Other pure helper       | `src/lib/<name>.ts` |

Rule: no React imports unless wrapper hook. No business logic.

### Current lib

- `tool-builder-runtime.ts` — pure preview helpers (`resolveBinding`, `initialStateMap`, `runChain`, `nodeSubtitle`). No React, no Redux.
- `node-catalog.ts` — serialisable view of the node catalogue (`getNodeCatalog()`, `getNodeCount()`): flattens `@/constants/tool-builder` (which carries icon components) into plain grouped data + i18n keys, safe to cross server/client and feed non-React readers. Also `getNodeReference()` / `getNodeReferenceFor()` — fully-resolved flat records merging catalogue identity + canonical English label/blurb (`MESSAGES.en`) + the `@/constants/node-docs` detail, the shape intended for an **AI tool call**. Consumed by the `NodeDocs` feature.
- `chat-context.ts` — pure bridge from the open tool to the chat assistant's prompt inputs (`buildChatToolContext(tool, stateNode)` → `ChatToolContext`): the connected node chain (label/`@slug` + `nodeSubtitle` detail), the compact catalog of every node type, in-depth docs for the node types in use, and the default-config JSON `schemas` for every node type. Feeds `buildChatSystemPrompt` (`@/constants/ai-prompts`). Also exports `parseBuildSpec` (recover + sanitise the model's one-shot JSON build spec into a `BuildSpec` — resolve `type` by id/`@slug`/label, strip protected keys, drop `state` nodes) and `validateTool`/`validateNode` (flag unknown fields + dead state-slot wires for the review/fix turn), plus `buildToolPrompt` (reproducible build instruction, used by tool-name generation). No React; never surfaces internal ids. Consumed by the `BuilderPanel` chat view.
- `json-to-ts.ts` — pure JSON → TypeScript declaration generator (`jsonToTs`). Used by the Tool Builder's `ts_type` (TS Type Converter) node via the runtime.
- `generate-tool-name.ts` / `generate-tool-icon.ts` — pure AI orchestration for the tools panel: name a tool, or draw its sidebar SVG icon, from the tool's node chain via the user's Builder-chat model. Both derive prompt context with `buildToolPrompt` (no internal ids leak); the icon helper sanitizes the model's SVG with `sanitizeSvgIcon` before returning it.
- `generate-identity.ts` — pure faker.js synthetic-data generator (`generateIdentities`). Parses the Identity node's JSON `@modifier` template, seeds faker deterministically per node seed, and materialises `count` records. Used by the runtime (`tool-builder-runtime`) and the `IdentityView` preview renderer. Modifier `@token` → generator map; keep in sync with `FAKER_MODIFIERS` in `@/constants/tool-builder`.
- `html-sanitize.ts` — `sanitize-html` wrappers: `sanitizeHtmlDoc` (HTML Sanitize node, layout-preserving allowlist) and `sanitizeSvgIcon` (strict SVG-only allowlist for the per-tool sidebar icon; strips scripts, styles, `<image>`, and all URL-bearing attributes).
- `playwright-scrape.ts` — browser-side caller for the `playwright_scrape` logic node. POSTs to the **local** Playwright scrape server in this repo (`playwright/server/scrape-server.mjs`, base URL set per-node — no hosted default; CORS-enabled there) and returns the parsed `{ data, finalUrl, … }`. Surfaces an actionable "is it running locally?" error when the server is unreachable. Used by the runtime (`tool-builder-runtime`). See `playwright/SCRAPE.md`.
- `csv.ts` — pure CSV parser (`parseCsv`, wraps PapaParse) producing an optimized rows array (typed values, empty rows/columns dropped). Used by the Tool Builder's `csv` input node in `PreviewPane`.
- `xlsx.ts` — pure Excel-workbook parser (`parseXlsx`). Dynamically imports SheetJS (pinned to its CVE-free official CDN build, not the vulnerable npm `xlsx`), reads one worksheet, and round-trips it through `parseCsv` so the output array matches the CSV node exactly. Returns the workbook's `sheetNames` too. Used by the Tool Builder's `xlsx` input node in `PreviewPane`.
- `aggregate.ts` — pure group-by / rollup helper (`aggregateRows`, wraps Arquero). Groups an array of object rows by columns and reduces each group to aggregate columns (count/sum/mean/median/mode/min/max/distinct/stdev/variance) built as safe Arquero string expressions (no eval). Used by the `aggregate` logic node via the runtime (`tool-builder-runtime`).
- `gallery.ts` — pure gallery-handle helpers (`HANDLE_PATTERN`, `normalizeHandle`, `isValidHandle`). The handle is a gallery's only public key; the format mirrors the DB `galleries_handle_format` check constraint. Used by `useGallery`, the `Gallery` manager, and the public gallery route/API.
- `table-data.ts` — pure table-data normalizer (`normalizeTableData`, `compareCells`, `formatCell`): auto-optimizes any array / JSON string into a render-ready grid (typed cells, empty rows/columns dropped) and detects per-column kinds (string/number/date) for sorting. Used by the Tool Builder's `table` input node (`PreviewPane/components/DataTable.tsx`).
- `supabase/client.ts` — browser Supabase client factory (`createClient()`). Use in `"use client"` components/hooks.
- `supabase/server.ts` — async server Supabase client factory (`await createClient()`). Use in Server Components, Server Functions, Route Handlers.

---

## src/schemas/ — Zod schemas

| File                      | Goes in                   |
| ------------------------- | ------------------------- |
| Domain validation schemas | `src/schemas/<domain>.ts` |

Rule: group by domain (e.g. `auth.ts`, `organization.ts`). Export named.

### Current schemas

None yet.

> **Example usage** (target convention): `src/schemas/auth.ts`, `src/schemas/organization.ts`

---

## src/constants/ — Static values

| File                    | Goes in                           |
| ----------------------- | --------------------------------- |
| Route paths             | `src/constants/routes.ts`         |
| Permission constants    | `src/constants/permissions.ts`    |
| Org tree colors         | `src/constants/org-tree-color.ts` |
| Backend API paths       | `src/constants/backend-api.ts`    |
| Static enums / catalogs | `src/constants/<name>.ts`         |

Rule: never hardcode route strings in JSX — use `Routes.X`. Use `.tsx` only when the catalog stores component/icon references.

### Current constants

- `tool-builder.tsx` — node catalog (`NODE_META`, `ACCENT_CLASSES`, `PALETTE_GROUPS`), the `createNode()` factory, and `uuid()`. `.tsx` because entries reference lucide icon components.
- `node-docs.ts` — long-form per-node reference docs (`NodeDetail` type, `NODE_DETAILS` keyed by `ToolNodeType`, `getNodeDetail()`). Pure serialisable English content (summary, when-to-use, config controls, state in/out, tips, example) — the _content_ layer behind the docs detail dialog, and AI-tool-call-ready (no React/icons). Short labels/blurbs stay in `i18n.ts`; the depth lives here.
- `ai-prompts.ts` — **single source of truth for every AI prompt.** Base system prompts (`CODE_EDITOR_SYSTEM_PROMPT`, `AI_NODE_SYSTEM_PROMPT`, `CHAT_SYSTEM_PROMPT`) + pure context builders that assemble the full prompt from live data passed by callers: `stateContext()`, `buildCodeEditorSystemPrompt()` (code-editor Ask AI panel), `buildAiNodeSystemPrompt()` (runtime `@ai` node), `buildChatSystemPrompt()` / `toolChainContext()` (Builder chat tab — grounds the assistant in the open tool's connected node chain), and the tools-panel generators `TOOL_NAME_SYSTEM_PROMPT` / `buildToolNamePrompt()` (name a tool) + `TOOL_ICON_SYSTEM_PROMPT` / `buildToolIconPrompt()` (draw a tool's SVG icon). No React/state reads; never surfaces internal ids. Consumed by `@/components/ui/code-editor`, `@/lib/tool-builder-runtime`, and (next) the chat feature.
- `settings.tsx` — available-settings catalog (`THEME_OPTIONS`, `LOCALE_OPTIONS`, `TOGGLE_SETTINGS`, `SETTINGS_STORAGE_KEY`) consumed by the `Settings` feature. Labels are `MessageKey`s resolved at render. `.tsx` because options carry lucide icons.
- `i18n.ts` — in-house i18n message catalog (`MESSAGES` per `AppLocale`, `MessageKey` type). Hardcoded `en` + `my` (Burmese) dictionaries; `en` is the source-of-truth key set (the `my: Record<MessageKey, string>` value type forces parity). Covers Topbar, Settings, PreviewPane, the Tools/Builder/Node panels (chrome + node-catalog labels/blurbs), and the full NodeEditor detail form (field labels, helper text, toggles, targets, dialogs). Only author-supplied content (a node's own fieldLabel/description/buttonText) stays untranslated. Resolved via `@/hooks/useTranslation`.

---

## src/types/ — Shared TypeScript types

| File                     | Goes in                        |
| ------------------------ | ------------------------------ |
| Cross-feature types      | `src/types/<name>.ts`          |
| Service response types   | `src/types/profile-service.ts` |
| Input/form types         | `src/types/inputs.ts`          |
| Environment declarations | `src/types/env.d.ts`           |

Rule: feature-only types co-locate with component.

### Current types

- `tool-builder.ts` — Tool Builder domain types (`Tool`, `ToolNode` union, `StateNode`, `StateBinding`, `EditorPlacement`, …) + `isRenderNode` guard / `RENDER_NODE_TYPES`.
- `gallery.ts` — Gallery domain types (`Gallery` settings, `GalleryTool` with flags, `GalleryToolCard`, and the public `PublicGallery` payload). No owner/user id on any client-facing shape.

---

## src/styles/ — Styles

| File                      | Goes in                       |
| ------------------------- | ----------------------------- |
| Global Tailwind + tokens  | `src/styles/globals.css`      |
| Input style builders      | `src/styles/inputs.styles.ts` |
| Shared className builders | `src/styles/<name>.styles.ts` |

---

## src/prompts/ — AI prompt assets

| File                            | Goes in                 |
| ------------------------------- | ----------------------- |
| AI-readable structure/spec docs | `src/prompts/<name>.md` |

### Current prompts

- `project_structure.md` — this file
- `build.md` — build instructions + rules
- `interaction-animation-requirements.md` — UI interaction/animation spec

---

## public/ — Static assets

| File                    | Goes in             |
| ----------------------- | ------------------- |
| Logos, icons, brand SVG | `public/<name>.svg` |
| Raster images           | `public/<name>.png` |

### Current assets

- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` (Next.js scaffold defaults)

---

## Project root

| File                 | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `next.config.ts`     | Next config                                        |
| `tsconfig.json`      | TS config (`@/*` → `./src/*`)                      |
| `components.json`    | shadcn/ui config                                   |
| `eslint.config.mjs`  | ESLint flat config                                 |
| `postcss.config.mjs` | PostCSS / Tailwind v4                              |
| `package.json`       | Deps + scripts                                     |
| `Dockerfile`         | Container build                                    |
| `docker-compose.yml` | Docker Compose config                              |
| `src/proxy.ts`       | Next.js 16 Proxy — session refresh + auth redirect |
| `AGENTS.md`          | Agent instructions                                 |
| `CLAUDE.md`          | Claude project rules                               |
| `README.md`          | Project docs                                       |

---

## Decision table — "Where does this new file go?"

| What you have                              | Folder                            |
| ------------------------------------------ | --------------------------------- |
| URL-bound page                             | `src/app/(<group>)/.../page.tsx`  |
| Backend endpoint                           | `src/app/api/<name>/route.ts`     |
| Top-level component for a screen           | `src/features/<Name>/<Name>.tsx`  |
| Sub-component used only inside that screen | `src/features/<Name>/components/` |
| Reusable UI primitive (button, dialog)     | `src/components/ui/`              |
| Project-specific wrapper of a primitive    | `src/components/customs/`         |
| SVG icon                                   | `src/components/icons/`           |
| Global state slice                         | `src/stores/slices/`              |
| Context provider                           | `src/providers/`                  |
| Hook used across features                  | `src/hooks/`                      |
| TanStack Query hook (shared)               | `src/hooks/query/`                |
| TanStack Mutation hook (shared)            | `src/hooks/mutation/`             |
| Pure util / API client                     | `src/lib/`                        |
| Validation schema                          | `src/schemas/`                    |
| Route path / enum                          | `src/constants/`                  |
| Cross-feature TS type                      | `src/types/`                      |
| Global CSS / token                         | `src/styles/`                     |
| AI prompt / structure doc                  | `src/prompts/`                    |
| Static asset                               | `public/`                         |
