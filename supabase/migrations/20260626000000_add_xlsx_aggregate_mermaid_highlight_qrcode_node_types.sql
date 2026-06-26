-- ---------------------------------------------------------------------------
-- Add `xlsx`, `aggregate`, `mermaid`, `highlight`, and `qrcode` node types.
--
-- `xlsx`      — Input / render node. Excel (.xlsx / .xls) sibling of the CSV
--               node. The end user uploads a workbook; the chosen sheet is
--               parsed client-side (SheetJS) into an optimized data array
--               (empty rows/columns dropped, cells typed) and the parsed
--               array — not the raw file — is written to the bound state slot.
--
-- `aggregate` — Logic node. Groups an array of rows by zero or more columns
--               and reduces each group to aggregate columns (count / sum /
--               mean / median / mode / min / max / distinct / stdev /
--               variance) with Arquero. Reads from an input slot, writes the
--               grouped result array to an output slot. Runs synchronously in
--               the live-change chain.
--
-- `mermaid`   — Render node (preview-only). Reads a Mermaid definition string
--               from the bound state slot and renders it to an SVG diagram in
--               the live preview. Never writes back to state.
--
-- `highlight` — Render node (preview-only). Reads a code string from the bound
--               state slot and renders a read-only syntax-highlighted code
--               block with Shiki. Never writes back to state.
--
-- `qrcode`    — Render node (preview-only). Encodes the string in the bound
--               state slot as a QR code rendered to crisp SVG at the chosen
--               module size and error-correction level. Never writes back to
--               state.
--
-- ADD VALUE IF NOT EXISTS is idempotent and cannot run inside a txn that also
-- uses the new value, so keep these as standalone statements.
-- ---------------------------------------------------------------------------
alter type public.tool_node_type add value if not exists 'xlsx';
alter type public.tool_node_type add value if not exists 'aggregate';
alter type public.tool_node_type add value if not exists 'mermaid';
alter type public.tool_node_type add value if not exists 'highlight';
alter type public.tool_node_type add value if not exists 'qrcode';
