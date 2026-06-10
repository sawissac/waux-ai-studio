/**
 * Pure data-normalization helpers for the Tool Builder's Table input node.
 * Turn whatever lands in a state slot — an array of objects, an array of
 * arrays, or a JSON string of either — into an optimized, render-ready grid:
 * empty rows/columns dropped, numeric/boolean strings typed, strings trimmed,
 * and per-column value kinds (string / number / date) detected so sorting can
 * pick the right comparator. No React, no Redux.
 */

/** Detected value kind of a column — drives the sorting comparator. */
export type TableColumnKind = "string" | "number" | "date";

/** One displayable column of a normalized table. */
export interface TableColumn {
  /** Key used to read this column's cell from a row object. */
  key: string;
  /** Header label shown in the table. */
  label: string;
  /** Detected value kind (sampled from the column's cells). */
  kind: TableColumnKind;
}

/** A normalized, render-ready table: uniform rows keyed by column key. */
export interface TableData {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

/** Empty result used for unrecognizable input. */
const EMPTY: TableData = { columns: [], rows: [] };

/** Max rows sampled per column when detecting its value kind. */
const KIND_SAMPLE_LIMIT = 200;

/** True when a cell is empty after trimming (treated as "no value"). */
const isEmptyCell = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/** Matches strings that are plain finite numbers (int, float, exponent). */
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Date-looking string guards. `Date.parse` alone is too lax ("May 5" parses),
 * so a string must match one of these shapes *and* parse to a valid date:
 * ISO (`2026-06-10`, with optional time), slash/dot dates (`6/10/2026`,
 * `10.06.2026`, `2026/06/10`), and RFC-ish month-name dates (`Jun 10, 2026`).
 */
const DATE_RES = [
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/,
  /^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/,
  /^\d{4}[/.]\d{1,2}[/.]\d{1,2}$/,
  /^\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{2,4}$/,
  /^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4}$/,
];

/** True when `s` looks like a date and parses to a valid timestamp. */
const isDateString = (s: string): boolean =>
  DATE_RES.some((re) => re.test(s)) && !Number.isNaN(Date.parse(s));

/**
 * Optimize one raw cell for display & sorting: trim strings, turn empty
 * strings into `null`, and type numeric / boolean strings into real
 * `number` / `boolean` values (so `"42"` sorts as 42, not after `"100"`).
 */
function coerceCell(v: unknown): unknown {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v !== "string") {
    return v;
  }
  const s = v.trim();
  if (s === "") {
    return null;
  }
  if (NUMERIC_RE.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  if (s === "true") {
    return true;
  }
  if (s === "false") {
    return false;
  }
  return s;
}

/**
 * Detect a column's value kind from a sample of its non-empty cells.
 * `number` / `date` only when *every* sampled cell agrees; anything mixed
 * falls back to `string` (sorted with a natural, numeric-aware compare).
 */
function detectKind(
  rows: Record<string, unknown>[],
  key: string,
): TableColumnKind {
  let sampled = 0;
  let numbers = 0;
  let dates = 0;
  for (const row of rows) {
    if (sampled >= KIND_SAMPLE_LIMIT) {
      break;
    }
    const v = row[key];
    if (isEmptyCell(v)) {
      continue;
    }
    sampled++;
    if (typeof v === "number") {
      numbers++;
    } else if (
      v instanceof Date ||
      (typeof v === "string" && isDateString(v))
    ) {
      dates++;
    }
  }
  if (sampled === 0) {
    return "string";
  }
  if (numbers === sampled) {
    return "number";
  }
  if (dates === sampled) {
    return "date";
  }
  return "string";
}

/**
 * Compare two non-empty cells of the given kind (ascending). Empty cells are
 * handled by the table layer (kept last via `sortUndefined`), so this only
 * sees real values.
 *
 * - `number` — numeric compare (`0 → 9`).
 * - `date` — timestamp compare (oldest → newest); unparseable values last.
 * - `string` — natural compare (`a → z`, digit runs compared numerically).
 */
export function compareCells(
  a: unknown,
  b: unknown,
  kind: TableColumnKind,
): number {
  if (kind === "number") {
    return Number(a) - Number(b);
  }
  if (kind === "date") {
    const ta = a instanceof Date ? a.getTime() : Date.parse(String(a));
    const tb = b instanceof Date ? b.getTime() : Date.parse(String(b));
    if (Number.isNaN(ta) || Number.isNaN(tb)) {
      return Number.isNaN(ta) ? (Number.isNaN(tb) ? 0 : 1) : -1;
    }
    return ta - tb;
  }
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/** Stringify one cell for display (objects compact, empties blank). */
export function formatCell(v: unknown): string {
  if (v === null || v === undefined) {
    return "";
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/**
 * Normalize an arbitrary state value into a render-ready {@link TableData}.
 *
 * Accepted shapes:
 * - `Record<string, unknown>[]` — column set is the union of row keys,
 * - `unknown[][]` — positional columns named `col1…colN`,
 * - `unknown[]` of primitives — a single `value` column,
 * - a JSON string of any of the above (parsed first),
 * - anything else → empty table.
 *
 * Optimizations applied (the "auto optimize" pass):
 * - cells trimmed; numeric / boolean strings typed via {@link coerceCell},
 * - rows whose every cell is empty are dropped,
 * - columns whose every cell is empty are dropped,
 * - per-column kind detected ({@link detectKind}) for type-aware sorting.
 *
 * @param value - Raw state-slot value bound to the Table node.
 * @returns Normalized columns + rows; empty when the input isn't tabular.
 */
export function normalizeTableData(value: unknown): TableData {
  let input = value;
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) {
      return EMPTY;
    }
    try {
      input = JSON.parse(s);
    } catch {
      return EMPTY;
    }
  }
  if (!Array.isArray(input) || input.length === 0) {
    return EMPTY;
  }

  // Build uniform object rows + the ordered union of column keys.
  const keys: string[] = [];
  const seen = new Set<string>();
  const addKey = (k: string) => {
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  };

  const rows: Record<string, unknown>[] = [];
  for (const item of input) {
    if (Array.isArray(item)) {
      const obj: Record<string, unknown> = {};
      item.forEach((cell, i) => {
        const k = `col${i + 1}`;
        addKey(k);
        obj[k] = coerceCell(cell);
      });
      rows.push(obj);
    } else if (item !== null && typeof item === "object") {
      const obj: Record<string, unknown> = {};
      for (const [k, cell] of Object.entries(item)) {
        addKey(k);
        obj[k] = coerceCell(cell);
      }
      rows.push(obj);
    } else {
      addKey("value");
      rows.push({ value: coerceCell(item) });
    }
  }

  // Drop fully-empty rows, then fully-empty columns.
  const liveRows = rows.filter((r) => keys.some((k) => !isEmptyCell(r[k])));
  if (liveRows.length === 0) {
    return EMPTY;
  }
  const liveKeys = keys.filter((k) => liveRows.some((r) => !isEmptyCell(r[k])));

  const columns: TableColumn[] = liveKeys.map((key) => ({
    key,
    label: key,
    kind: detectKind(liveRows, key),
  }));

  return { columns, rows: liveRows };
}
