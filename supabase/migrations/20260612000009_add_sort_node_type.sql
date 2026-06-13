-- ---------------------------------------------------------------------------
-- Add the `sort` node type.
--
-- `sort` — Order an array by a field, compared as text / number / date.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'sort';
