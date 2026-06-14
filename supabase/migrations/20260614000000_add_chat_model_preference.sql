-- ---------------------------------------------------------------------------
-- Global chat model selection — persisted per user (not per tool).
--
-- The Builder chat tab lets a user pick an AI provider + model. That choice is
-- global across every tool they own, so it lives on `profiles` (1:1 with
-- auth.users, id == auth.uid()) rather than on `tools` / `tool_nodes`.
--
-- No new RLS needed: the existing `profiles_select_self` / `profiles_update_self`
-- policies (see 20260608000000_init) already scope these columns to the owner.
--
-- Idempotent — safe to re-run.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists chat_provider text not null default 'gemini',
  add column if not exists chat_model    text;

-- Constrain provider to the supported set (matches `AiProvider` in the app).
alter table public.profiles
  drop constraint if exists profiles_chat_provider_check;

alter table public.profiles
  add constraint profiles_chat_provider_check
  check (chat_provider in ('gemini', 'openrouter'));

comment on column public.profiles.chat_provider is
  'Builder chat tab: selected AI provider (gemini | openrouter). Global per user.';
comment on column public.profiles.chat_model is
  'Builder chat tab: selected model id for chat_provider. Null falls back to the app default.';
