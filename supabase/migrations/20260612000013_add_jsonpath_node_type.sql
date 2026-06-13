-- ---------------------------------------------------------------------------
-- Add the `jsonpath` node type.
--
-- `jsonpath` — Pull a nested value out of JSON with a dotted / bracketed path.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'jsonpath';
