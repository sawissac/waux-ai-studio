This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Installation

### Prerequisites

| Tool                                     | Version | Notes                                                                         |
| ---------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org)            | 20.9+   | Required by Next.js 16                                                        |
| [pnpm](https://pnpm.io)                  | 9+      | Package manager (lockfile is `pnpm-lock.yaml`). Enable with `corepack enable` |
| [Supabase account](https://supabase.com) | —       | Backend (auth + database)                                                     |

### Core libraries

- **[Next.js](https://nextjs.org) 16** + **[React](https://react.dev) 19** — app framework
- **[Supabase](https://supabase.com)** (`@supabase/ssr`, `@supabase/supabase-js`) — auth & database
- **[Tailwind CSS](https://tailwindcss.com) 4** + **[Radix UI](https://www.radix-ui.com)** / **[shadcn](https://ui.shadcn.com)** — styling & components
- **[Redux Toolkit](https://redux-toolkit.js.org)** + **[TanStack Query](https://tanstack.com/query)** — state & data fetching
- **[Zod](https://zod.dev)** + **[TanStack Form](https://tanstack.com/form)** — validation & forms

All pulled in by `pnpm install` — no manual setup needed.

### AI providers

The Builder chat assistant is **bring-your-own-key**. No AI SDK or server key is required to install — keys are entered in-app (AI-keys popover in the Tools panel) and stored in the browser's `localStorage`. Two providers are supported:

| Provider          | Get a key                                              | Stored as            |
| ----------------- | ------------------------------------------------------ | -------------------- |
| **Google Gemini** | [Google AI Studio](https://aistudio.google.com/apikey) | `GEMINI_API_KEY`     |
| **OpenRouter**    | [openrouter.ai/keys](https://openrouter.ai/keys)       | `OPENROUTER_API_KEY` |

You only need a key for the provider you intend to use. Per-node keys override the global key.

### Steps

```bash
# 1. Install dependencies (also sets up husky git hooks)
pnpm install

# 2. Create your env file
cp .env.dev .env.dev.local   # or edit .env.dev directly
```

Fill in the env vars (from your Supabase project's API settings):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
# 3. (Optional) Push the database schema to Supabase
pnpm push           # runs: pnpm supabase db push

# 4. Run the dev server
pnpm dev            # uses standard Next.js env loading
# or, to load .env.dev explicitly:
pnpm env-dev        # runs: dotenv -e .env.dev -- next dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Agent Skills

This repo ships with [Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills) for AI coding assistants (Claude Code, etc.). They are checked in — no install step — but their sources are tracked for updates.

### Remote skills (`.agents/skills/`)

Pinned in `skills-lock.json`, sourced from GitHub [`supabase/agent-skills`](https://github.com/supabase/agent-skills):

| Skill                                | Purpose                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **supabase**                         | Any Supabase task — Database, Auth, Edge Functions, Realtime, Storage, `supabase-js` / `@supabase/ssr`, CLI/MCP, migrations, RLS |
| **supabase-postgres-best-practices** | Postgres performance & best practices — writing, reviewing, optimizing queries, schemas, and DB config                           |

### Local skills (`.claude/skills/`)

| Skill             | Purpose                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **ui-ux-pro-max** | UI/UX design intelligence — styles, palettes, font pairings, charts, and per-stack guidance for planning/building/reviewing UI |

## Code Intelligence (optional)

Two optional tools speed up AI-assisted work on this repo. Both produce **local, machine-specific artifacts** — `.codegraph/` and `graphify-out/` are git-ignored, so each developer generates their own. Neither is required to build or run the app.

### CodeGraph

A SQLite knowledge graph of every symbol, edge, and file — lets an AI assistant locate and understand code in one query instead of grepping. Powers the `.claude/CLAUDE.md` CodeGraph workflow.

```bash
# Install the CLI (Node-based, global)
npm install -g codegraph

# Build the initial index in this repo
codegraph init

# (Optional) wire the MCP server into your agent (Claude Code, Cursor, Codex CLI, ...)
codegraph install
```

Usage (shell — same output as the MCP tools):

```bash
codegraph explore "<symbols or a question>"   # relevant source + call paths
codegraph node <symbol-or-file>               # one symbol's source + callers
codegraph sync                                 # refresh after edits (a watcher daemon also auto-syncs)
```

### Graphify

A Claude Code skill that turns any input (code, docs, papers, images, video) into a queryable knowledge graph, written to `graphify-out/` (`GRAPH_REPORT.md`, `graph.html`, `graph.json`). When `graphify-out/` exists, questions about the project are answered against it.

```text
/graphify <path or question>
```

Open `graphify-out/graph.html` in a browser for the interactive graph.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
