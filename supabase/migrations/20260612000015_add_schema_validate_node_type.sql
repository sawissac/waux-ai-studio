-- ---------------------------------------------------------------------------
-- Add the `schema_validate` node type.
--
-- `schema_validate` — Validate JSON shape against field + type rules; writes a boolean to gate the chain.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'schema_validate';
