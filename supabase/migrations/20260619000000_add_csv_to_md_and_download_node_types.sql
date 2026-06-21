-- ---------------------------------------------------------------------------
-- Add `csv_to_md` and `download` node types.
--
-- `csv_to_md` — Logic node. Reads a tabular array from an input state slot
--              and converts it to a GitHub-Flavored Markdown table string,
--              writing the result to an output state slot. Runs synchronously
--              in the live-change chain.
--
-- `download`  — Input / render node. Renders a download button in the live
--              preview. On click it reads the bound state slot and exports
--              its content as CSV (PapaParse), Markdown, SVG, PNG, or JPEG.
--              Never writes back to state.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep these as standalone statements.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'csv_to_md';
alter type public.tool_node_type add value if not exists 'download';
