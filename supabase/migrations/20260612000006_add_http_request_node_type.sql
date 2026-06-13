-- ---------------------------------------------------------------------------
-- Add the `http_request` node type.
--
-- `http_request` — Issue an HTTP request through the server-side proxy and write the parsed response to bound state.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep this as a standalone statement.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'http_request';
