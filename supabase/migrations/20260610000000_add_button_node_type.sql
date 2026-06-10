-- ---------------------------------------------------------------------------
-- Add node types introduced after the initial schema.
--
-- `button`   — standalone action button that runs targeted code/AI nodes.
-- `markdown` — multi-line Markdown input (added in app, back-fill the enum).
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep these as standalone statements.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'markdown';
alter type public.tool_node_type add value if not exists 'button';
