-- ---------------------------------------------------------------------------
-- Add the `toggle` node type.
--
-- `toggle` — boolean on/off switch, two-way bound to its state slot. The bound
--            value is stored as the string "true" / "false".
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'toggle';
