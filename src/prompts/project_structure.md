# Project Structure — File Placement Rules

Last updated: 2026-06-07

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
- `app/page.tsx` — home page `/`
- `app/favicon.ico`

No route groups or API routes yet.

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
| Feature sub-component (private) | `src/features/<FeatureName>/components/<Name>.tsx` |

Rule: folder name == entry file name (PascalCase). Sub-components NOT shared across features.

### Current features

None yet.

> **Example usage** (target convention):
>
> - `src/features/AuthLogin/AuthLogin.tsx` — entry component
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

**ui/** — `button` (shadcn/ui, new-york style, neutral base)

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

- `store.ts` — `makeStore()` factory (per-request store) + `RootState`/`AppDispatch`/`AppStore` types
- `hooks.ts` — typed `useAppDispatch`, `useAppSelector`, `useAppStore`
- `slices/appConfigSlice.ts` — global `appConfig` (theme, locale, sidebarCollapsed, hydrated). Mounted via `StoreProvider` in `src/app/layout.tsx`

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

---

## src/hooks/ — Shared React hooks

| File                             | Goes in                            |
| -------------------------------- | ---------------------------------- |
| Reusable hook used by >1 feature | `src/hooks/use<Name>.ts`           |
| TanStack Query hook (shared)     | `src/hooks/query/use<Name>.tsx`    |
| TanStack Mutation hook (shared)  | `src/hooks/mutation/use<Name>.tsx` |

Rule: feature-only hooks stay inside feature folder, not here. Query/mutation hooks organized in subdirectories.

### Current hooks

None yet.

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

Rule: never hardcode route strings in JSX — use `Routes.X`.

---

## src/types/ — Shared TypeScript types

| File                     | Goes in                        |
| ------------------------ | ------------------------------ |
| Cross-feature types      | `src/types/<name>.ts`          |
| Service response types   | `src/types/profile-service.ts` |
| Input/form types         | `src/types/inputs.ts`          |
| Environment declarations | `src/types/env.d.ts`           |

Rule: feature-only types co-locate with component.

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

| File                 | Purpose                       |
| -------------------- | ----------------------------- |
| `next.config.ts`     | Next config                   |
| `tsconfig.json`      | TS config (`@/*` → `./src/*`) |
| `components.json`    | shadcn/ui config              |
| `eslint.config.mjs`  | ESLint flat config            |
| `postcss.config.mjs` | PostCSS / Tailwind v4         |
| `package.json`       | Deps + scripts                |
| `Dockerfile`         | Container build               |
| `docker-compose.yml` | Docker Compose config         |
| `AGENTS.md`          | Agent instructions            |
| `CLAUDE.md`          | Claude project rules          |
| `README.md`          | Project docs                  |

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
