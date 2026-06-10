-- ---------------------------------------------------------------------------
-- Add the `json` node type.
--
-- `json` — two-way bound JSON input rendered in a code editor; raw source
--          string is stored in the bound state slot.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'json';
