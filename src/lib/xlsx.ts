/**
 * Pure Excel-workbook parsing helper for the Tool Builder's Excel (xlsx) input
 * node — the spreadsheet sibling of `@/lib/csv`. Wraps SheetJS to read one
 * worksheet, then runs it through {@link parseCsv} so the output is optimized
 * identically to the CSV node (empty rows/columns dropped, numbers & booleans
 * typed, headers trimmed & de-duplicated). No React, no Redux.
 *
 * SheetJS is dynamically imported so its sizeable parser never weighs down the
 * initial bundle or the server build — it loads only when a workbook is opened.
 */
import { type CsvParseResult, parseCsv } from "@/lib/csv";

/** Outcome of parsing one Excel workbook (a {@link CsvParseResult} + sheets). */
export interface XlsxParseResult extends CsvParseResult {
  /** Every worksheet name in the workbook, in tab order (for the sheet picker). */
  sheetNames: string[];
}

/**
 * Parse one worksheet of an Excel workbook into an optimized data array.
 *
 * The chosen sheet is converted to CSV by SheetJS and handed to
 * {@link parseCsv}, so the returned `rows` match the CSV node exactly — an
 * actual array (objects keyed by header when `hasHeader`, otherwise positional
 * arrays), ready to iterate in code nodes without manual parsing.
 *
 * @param data - The uploaded workbook bytes (e.g. `await file.arrayBuffer()`).
 * @param hasHeader - Treat the first row as column names; rows become objects.
 * @param sheet - Worksheet name to read; falls back to the first sheet when
 *   blank or unknown.
 * @returns The optimized rows + column metadata + workbook sheet names, or an
 *   `error` message (never throws).
 */
export async function parseXlsx(
  data: ArrayBuffer,
  hasHeader: boolean,
  sheet?: string,
): Promise<XlsxParseResult> {
  const empty: XlsxParseResult = {
    rows: [],
    fields: [],
    rowCount: 0,
    error: null,
    sheetNames: [],
  };
  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(new Uint8Array(data), { type: "array" });
    const sheetNames = wb.SheetNames ?? [];
    if (sheetNames.length === 0) {
      return { ...empty, error: "Workbook has no sheets." };
    }
    const target = sheet && sheetNames.includes(sheet) ? sheet : sheetNames[0];
    const ws = wb.Sheets[target];
    if (!ws) {
      return { ...empty, sheetNames, error: `Sheet "${target}" not found.` };
    }
    // CSV round-trip lets the CSV node's normalizer do all the optimization.
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    const parsed = parseCsv(csv, hasHeader);
    return { ...parsed, sheetNames };
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
