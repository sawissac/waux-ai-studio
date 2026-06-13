/**
 * Pure data-transform helpers shared by the Tool Builder logic nodes
 * (Filter / Map / Sort / Merge / JSONPath / Math / Schema Validate / Encode).
 * No React, no Redux, no DOM — plain functions over JSON-ish values so the
 * preview runtime can call them directly.
 */
import { JSONPath } from "jsonpath-plus";
import { all, create } from "mathjs";

import type {
  FilterOperator,
  SchemaRule,
  SortType,
} from "@/types/tool-builder";

/**
 * Coerce a state value that should be an array. Accepts a real array, or a
 * JSON string of one (code/input nodes may store either). Anything else → `[]`.
 */
export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Coerce a state value to a parsed JSON value. A real object/array passes
 * through; a JSON string is parsed; a bare string stays a string.
 */
export function asJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.trim()) {
    return "";
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Resolve a simple dotted / bracketed path on a value: `a.b[0].c`. Each
 * dot-segment may itself contain spaces (`Happy Birthday`). Missing segments
 * resolve to `undefined`.
 */
function resolveDotted(obj: unknown, clean: string): unknown {
  const parts = clean
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Resolve a field path on a value.
 *
 * - Empty path → the value itself.
 * - A path that starts with `$` is treated as full JSONPath (jsonpath-plus):
 *   supports `$..recursive`, `$.items[*]` wildcards, `[?(@.x>1)]` filters,
 *   and `$['Happy Birthday']` bracket-quoted keys. 0 matches → `undefined`,
 *   1 match → the scalar, ≥2 matches → an array of matches.
 * - Any other path uses the simple dotted resolver (`a.b[0].c`), where each
 *   dot-segment may contain spaces.
 */
export function getPath(obj: unknown, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "$") {
    return obj;
  }
  if (trimmed.startsWith("$")) {
    try {
      const matches = JSONPath({
        path: trimmed,
        json: obj as never,
        wrap: true,
      });
      if (!Array.isArray(matches) || matches.length === 0) {
        return undefined;
      }
      return matches.length === 1 ? matches[0] : matches;
    } catch {
      return undefined;
    }
  }
  return resolveDotted(obj, trimmed);
}

/** True when a filter operator ignores the comparison value. */
function isValueless(op: FilterOperator): boolean {
  return op === "exists" || op === "notExists";
}

/**
 * Evaluate one filter operator against a left value and a string comparison.
 * Numeric operators coerce both sides to numbers; string operators stringify.
 */
export function compareFilter(
  left: unknown,
  op: FilterOperator,
  right: string,
): boolean {
  if (isValueless(op)) {
    const present = left !== undefined && left !== null && left !== "";
    return op === "exists" ? present : !present;
  }
  const ls = left == null ? "" : String(left);
  switch (op) {
    case "eq":
      return ls === right;
    case "neq":
      return ls !== right;
    case "gt":
      return Number(left) > Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "contains":
      return ls.includes(right);
    case "startsWith":
      return ls.startsWith(right);
    case "endsWith":
      return ls.endsWith(right);
    default:
      return false;
  }
}

/** Comparator for the Sort node, comparing two values as `kind`. */
export function compareSort(a: unknown, b: unknown, kind: SortType): number {
  if (kind === "number") {
    return Number(a) - Number(b);
  }
  if (kind === "date") {
    return new Date(String(a)).getTime() - new Date(String(b)).getTime();
  }
  return String(a ?? "").localeCompare(String(b ?? ""));
}

/** Check one schema rule against a parsed JSON root; null = ok, else message. */
export function checkSchemaRule(
  root: unknown,
  rule: SchemaRule,
): string | null {
  const value = getPath(root, rule.field);
  if (value === undefined) {
    return `Missing field: ${rule.field || "(root)"}`;
  }
  if (rule.type === "any") {
    return null;
  }
  const actual = Array.isArray(value) ? "array" : typeof value;
  if (actual !== rule.type) {
    return `Field ${rule.field || "(root)"} expected ${rule.type}, got ${actual}`;
  }
  return null;
}

/**
 * Evaluate an expression over a variable scope using mathjs. Bare identifiers
 * resolve from `scope`; numeric strings are coerced to numbers, everything else
 * passes through so string/array/object math works too. The mathjs instance is
 * locked down — `import`, `createUnit`, and other scope-mutating functions are
 * disabled — so an expression cannot redefine built-ins or reach ambient scope.
 * Returns the result stringified for state storage; numbers/booleans/strings
 * become their plain text, structured values become JSON.
 */
const mathEval = create(all, {});
// Block function/unit (re)definition so an expression can't redefine built-ins;
// `evaluate`/`parse` stay live (we call them). Everything else (numbers, units,
// matrices, fractions, BigNumber, the full function library) is available.
const DISABLED_FUNCS = ["import", "createUnit"];
mathEval.import(
  Object.fromEntries(
    DISABLED_FUNCS.map((name) => [
      name,
      () => {
        throw new Error(`Function "${name}" is disabled`);
      },
    ]),
  ),
  { override: true },
);

export function evalExpression(
  expression: string,
  scope: Record<string, unknown>,
): string {
  // Coerce numeric-looking strings to numbers so arithmetic over state works;
  // leave other values as-is for string/structured operations.
  const evalScope: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(scope)) {
    if (
      typeof v === "string" &&
      v.trim() !== "" &&
      Number.isFinite(Number(v))
    ) {
      evalScope[k] = Number(v);
    } else {
      evalScope[k] = v;
    }
  }
  const result = mathEval.evaluate(expression, evalScope);
  if (result === null || result === undefined) {
    throw new Error(`Expression produced no value: ${expression}`);
  }
  if (typeof result === "number" && !Number.isFinite(result)) {
    throw new Error(
      `Expression did not produce a finite number: ${expression}`,
    );
  }
  if (
    typeof result === "number" ||
    typeof result === "boolean" ||
    typeof result === "string"
  ) {
    return String(result);
  }
  // BigNumber, Fraction, Complex, Matrix, Unit, etc. all stringify sanely.
  if (typeof result?.toString === "function") {
    return result.toString();
  }
  return JSON.stringify(result);
}
