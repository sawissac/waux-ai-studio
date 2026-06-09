-- Shared tools — allow public (unauthenticated) read access to shared tools.
--
-- Safe to re-run: drops the column + policies first if they exist.

-- Drop policies before altering the table.
drop policy if exists tools_public_shared_read  on public.tools;
drop policy if exists nodes_public_shared_read  on public.tool_nodes;

-- Add the is_shared flag (idempotent via IF NOT EXISTS workaround).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'tools'
      and column_name  = 'is_shared'
  ) then
    alter table public.tools
      add column is_shared boolean not null default false;
  end if;
end;
$$;

-- Any anon/service caller may SELECT a tool that has is_shared = true.
create policy tools_public_shared_read on public.tools
  for select using (is_shared = true);

-- And its nodes, when the parent tool is shared.
create policy nodes_public_shared_read on public.tool_nodes
  for select using (
    exists (
      select 1 from public.tools t
      where t.id = tool_id and t.is_shared = true
    )
  );
