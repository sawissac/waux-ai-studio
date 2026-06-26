-- Add a per-tool SVG icon.
--
-- Tools gain an optional `icon` column holding a sanitized SVG markup string
-- (rendered in the tools sidebar and editable / AI-generatable from the tool
-- options menu). NULL means "no icon" — the UI falls back to a default glyph.
-- Plain text column: the SVG is always re-sanitized client-side before render,
-- so no DB-side validation is required.

alter table public.tools
  add column if not exists icon text;
