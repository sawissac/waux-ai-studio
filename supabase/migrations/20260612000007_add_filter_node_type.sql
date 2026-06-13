-- ---------------------------------------------------------------------------
-- Add the `filter` node type.
--
-- `filter` — Keep array rows from the input whose field satisfies a comparison operator.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'filter';
