-- ---------------------------------------------------------------------------
-- Add the `map` node type.
--
-- `map` — Reshape array rows into new objects by mapping output keys to source paths.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'map';
