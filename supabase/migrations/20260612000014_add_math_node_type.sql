-- ---------------------------------------------------------------------------
-- Add the `math` node type.
--
-- `math` — Evaluate an arithmetic expression over numeric state; no JS eval.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'math';
