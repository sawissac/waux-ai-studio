-- Gallery — a per-user public showcase of selected tools.
--
-- Adds a `galleries` table (one row per user) and a `tools.in_gallery` flag.
-- A tool appears on a user's public gallery page when ALL hold:
--   • the gallery   is_public  = true
--   • the tool      in_gallery = true
--   • the tool      is_shared  = true   (publicly readable — the existing flag)
--
-- Reusing `is_shared` means a gallery tool is already covered by the
-- `tools_public_shared_read` RLS policy, so the public gallery query needs no
-- new tool policy — only a public-read policy on `galleries` itself.
--
-- Safe to re-run: the table/column/index/trigger adds are guarded, and the
-- policies are dropped + recreated AFTER the table exists (a bare
-- `drop policy if exists` still errors 42P01 if the table is missing — the
-- IF EXISTS guards the policy, not the relation). Full teardown lives in init.

-- ---------------------------------------------------------------------------
-- galleries — 1:1 with a user; the public profile page that lists their tools
-- ---------------------------------------------------------------------------

create table if not exists public.galleries (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  -- Public URL handle (/g/<handle>). NULL until the user claims one. The
  -- owner id is never exposed on the wire — the handle is the only public key.
  handle      text unique,
  title       text not null default '',
  description text not null default '',
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- 3–32 chars, lowercase alphanumerics with internal single hyphens; must
  -- start and end with an alphanumeric. Keep in sync with `HANDLE_PATTERN`
  -- in `src/lib/gallery.ts`.
  constraint galleries_handle_format
    check (handle is null or handle ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$')
);

create index if not exists galleries_handle_idx on public.galleries (handle);

-- ---------------------------------------------------------------------------
-- tools — membership flag (does this tool belong to its owner's gallery?)
-- ---------------------------------------------------------------------------

alter table public.tools
  add column if not exists in_gallery boolean not null default false;

-- ---------------------------------------------------------------------------
-- Trigger (drop + recreate now that the table is guaranteed to exist)
-- ---------------------------------------------------------------------------

drop trigger if exists galleries_touch on public.galleries;
create trigger galleries_touch
  before update on public.galleries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.galleries enable row level security;

drop policy if exists galleries_owner_all   on public.galleries;
drop policy if exists galleries_public_read on public.galleries;

-- Owner has full access to their own gallery row.
create policy galleries_owner_all on public.galleries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Anyone (incl. anon) may read a gallery that is published.
create policy galleries_public_read on public.galleries
  for select using (is_public = true);
