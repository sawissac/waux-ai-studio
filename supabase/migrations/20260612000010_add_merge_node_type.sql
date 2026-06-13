-- ---------------------------------------------------------------------------
-- Add the `merge` node type.
--
-- `merge` — Join two state arrays on a key — right fields spread over matching left rows.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'merge';
