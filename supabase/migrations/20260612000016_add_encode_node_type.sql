-- ---------------------------------------------------------------------------
-- Add the `encode` node type.
--
-- `encode` — Base64 / URL encode-decode, or a one-way SHA-256 hash over a string.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'encode';
