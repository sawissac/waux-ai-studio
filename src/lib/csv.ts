/**
 * Pure CSV parsing helper for the Tool Builder's CSV input node. Wraps
 * PapaParse and post-processes the result into an optimized, code-node-ready
 * payload: empty rows/columns dropped, numbers & booleans typed, headers
 * trimmed and de-duplicated. No React, no Redux.
 */
import Papa from "papaparse";

/** Outcome of parsing one CSV document. */
export interface CsvParseResult {
  /**
   * Optimized data written to the bound state slot. With a header row this is
   * `Record<string, unknown>[]` (one object per row, keyed by column name);
   * without, `unknown[][]` (one array per row).
   */
  rows: unknown[];
  /** Column names (header mode) or `col1…colN` style positions (no header). */
  fields: string[];
  /** Number of data rows after empty-row pruning. */
  rowCount: number;
  /** First fatal parse error message, or `null` when the parse succeeded. */
  error: string | null;
}

/** True when a cell is empty after trimming (treated as "no value"). */
const isEmptyCell = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/**
 * Make header names safe & unique: trim whitespace, replace empties with
 * `column<N>`, suffix duplicates with `_2`, `_3`, …
 */
function normalizeHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    const base = (h ?? "").trim() || `column${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}

/**
 * Parse a CSV source string into an optimized data array.
 *
 * Optimizations applied to the output:
 * - empty / whitespace-only rows are skipped (`skipEmptyLines: "greedy"`),
 * - numeric & boolean cells become real `number` / `boolean` values
 *   (`dynamicTyping`), so code nodes get usable data without `Number(...)`,
 * - cell strings are trimmed,
 * - columns whose header **and** every cell are empty are dropped entirely,
 * - header names are trimmed, de-duplicated, and never empty.
 *
 * The returned `rows` array is what the CSV node writes to its bound state —
 * an actual array (not a JSON string), so `state.get("…")` is immediately
 * iterable in code nodes.
 *
 * @param source - Raw CSV text (e.g. an uploaded file's contents).
 * @param hasHeader - Treat the first row as column names; rows become objects.
 * @returns The optimized rows plus column metadata, or an `error` message.
 */
export function parseCsv(source: string, hasHeader: boolean): CsvParseResult {
  const empty: CsvParseResult = {
    rows: [],
    fields: [],
    rowCount: 0,
    error: null,
  };
  if (!source.trim()) {
    return empty;
  }

  const parsed = Papa.parse<unknown[]>(source, {
    skipEmptyLines: "greedy",
    dynamicTyping: true,
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  const fatal = parsed.errors.find((e) => e.type !== "FieldMismatch");
  if (fatal) {
    return { ...empty, error: fatal.message };
  }

  const grid = parsed.data.filter((row) => row.some((c) => !isEmptyCell(c)));
  if (grid.length === 0) {
    return empty;
  }

  const width = Math.max(...grid.map((r) => r.length));
  const headerRow = hasHeader ? grid[0].map((c) => String(c ?? "")) : null;
  const dataRows = hasHeader ? grid.slice(1) : grid;

  // Keep only columns that carry data (or a named header) — drops the trailing
  // ghost columns spreadsheets love to export.
  const keep: number[] = [];
  for (let c = 0; c < width; c++) {
    const named = headerRow ? (headerRow[c] ?? "").trim() !== "" : false;
    const hasData = dataRows.some((r) => !isEmptyCell(r[c]));
    if (named || hasData) {
      keep.push(c);
    }
  }

  const fields = headerRow
    ? normalizeHeaders(keep.map((c) => headerRow[c] ?? ""))
    : keep.map((_, i) => `col${i + 1}`);

  const rows: unknown[] = dataRows.map((r) => {
    const cells = keep.map((c) => (isEmptyCell(r[c]) ? null : r[c]));
    if (!hasHeader) {
      return cells;
    }
    const obj: Record<string, unknown> = {};
    fields.forEach((f, i) => {
      obj[f] = cells[i];
    });
    return obj;
  });

  return { rows, fields, rowCount: rows.length, error: null };
}
