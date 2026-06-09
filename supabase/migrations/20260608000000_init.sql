-- Tool Builder — initial schema (idempotent reset)
--
-- Safe to re-run: drops all owned objects first, then rebuilds from scratch.
-- Paste into Supabase Dashboard → SQL Editor, or push via CLI after clearing
-- the migration record:
--   DELETE FROM supabase_migrations WHERE name = '20260608000000_init';
--   supabase db push

-- ---------------------------------------------------------------------------
-- Teardown (tables CASCADE — drops policies, triggers, indexes automatically)
-- ---------------------------------------------------------------------------

drop table if exists public.tool_nodes cascade;
drop table if exists public.tools      cascade;
drop table if exists public.profiles   cascade;

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user()  cascade;
drop function if exists public.touch_updated_at() cascade;

drop type if exists public.tool_node_type cascade;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.tool_node_type as enum (
  'state', 'text_run', 'textarea', 'code', 'canvas', 'ai'
);

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — public mirror of auth.users (1:1, id == auth.uid())
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tools — a named, ordered chain owned by a user
-- ---------------------------------------------------------------------------

create table public.tools (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tools_owner_position_idx on public.tools (owner_id, position);

create trigger tools_touch
  before update on public.tools
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- tool_nodes — one row per node; config JSONB holds per-type fields
--   state    → { states: StateEntry[] }
--   text_run → { fieldLabel, placeholder, buttonText, binding, runEnabled, … }
--   textarea → { fieldLabel, placeholder, binding }
--   code     → { code }
--   canvas   → { elementId, html }
--   ai       → { provider, model, systemInstruction, prompt, output }
-- ---------------------------------------------------------------------------

create table public.tool_nodes (
  id         uuid primary key default gen_random_uuid(),
  tool_id    uuid not null references public.tools (id) on delete cascade,
  position   integer not null,
  type       public.tool_node_type not null,
  config     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deferrable so a reorder can swap positions inside one transaction.
  constraint tool_nodes_tool_position_uniq
    unique (tool_id, position) deferrable initially deferred
);

create index tool_nodes_tool_position_idx on public.tool_nodes (tool_id, position);

-- At most one state node per tool.
create unique index tool_nodes_one_state_per_tool
  on public.tool_nodes (tool_id) where (type = 'state');

create trigger tool_nodes_touch
  before update on public.tool_nodes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security — owner-only access throughout
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.tools      enable row level security;
alter table public.tool_nodes enable row level security;

create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy tools_owner_all on public.tools
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy nodes_owner_all on public.tool_nodes
  for all
  using (
    exists (select 1 from public.tools t where t.id = tool_id and t.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.tools t where t.id = tool_id and t.owner_id = auth.uid())
  );
