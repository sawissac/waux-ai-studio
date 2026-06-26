/**
 * Pure group-by / aggregate helper for the Tool Builder's Aggregate node.
 *
 * Wraps Arquero: build a table from the input rows, optionally group by one or
 * more columns, and roll each group up into aggregate columns (count / sum /
 * mean / median / mode / min / max / distinct / stdev / variance). No React, no
 * Redux, no DOM — a plain function the preview runtime calls directly.
 *
 * Aggregate expressions are built as Arquero string expressions, which are
 * parsed by Arquero's own (acorn-based) parser restricted to the `op` namespace
 * and the row record `d` — there is no `eval`, no arbitrary JS, and no access to
 * ambient scope.
 */
import { from } from "arquero";

import { asArray } from "@/lib/transform";
import type { AggregateNode, AggregateOp } from "@/types/tool-builder";

/** Arquero rollup function name for each op (count is handled separately). */
const OP_FN: Record<Exclude<AggregateOp, "count">, string> = {
  sum: "sum",
  mean: "mean",
  median: "median",
  mode: "mode",
  min: "min",
  max: "max",
  distinct: "distinct",
  stdev: "stdev",
  variance: "variance",
};

/** A keyed input row Arquero can group / roll up. */
type Row = Record<string, unknown>;

/** Keep only object rows — Arquero aggregates keyed records, not arrays/scalars. */
function objectRows(value: unknown): Row[] {
  return asArray(value).filter(
    (r): r is Row => r !== null && typeof r === "object" && !Array.isArray(r),
  );
}

/** Default output column name when the author leaves a rule's `as` blank. */
function ruleName(op: AggregateOp, field: string): string {
  if (op === "count") {
    return "count";
  }
  return field ? `${op}_${field}` : op;
}

/**
 * Group the input value's rows by the node's `groupBy` columns and reduce each
 * group to its aggregate columns.
 *
 * - Only object rows are aggregated (array / primitive rows are ignored).
 * - With no `groupBy` columns the whole array collapses to one summary row.
 * - `count` counts rows in the group; every other op reads its `field` column.
 * - Non-count rules with a blank `field` are skipped; duplicate / colliding
 *   output names are suffixed so no column is silently overwritten.
 * - With nothing to group and nothing to compute, the rows pass through.
 * - Any Arquero error (e.g. a bad expression) yields `[]` instead of throwing.
 *
 * @param node - The Aggregate node config.
 * @param value - The raw value held in the node's input state slot.
 * @returns The grouped result as plain objects (one per group), or `[]`.
 */
export function aggregateRows(node: AggregateNode, value: unknown): Row[] {
  const rows = objectRows(value);
  if (rows.length === 0) {
    return [];
  }

  const groupKeys = (node.groupBy ?? []).map((c) => c.trim()).filter(Boolean);

  const seen = new Set<string>();
  const rollup: Record<string, string> = {};
  for (const rule of node.aggregations ?? []) {
    const field = rule.field.trim();
    if (rule.op !== "count" && !field) {
      continue;
    }
    let name = (rule.as || "").trim() || ruleName(rule.op, field);
    while (seen.has(name) || groupKeys.includes(name)) {
      name = `${name}_2`;
    }
    seen.add(name);
    rollup[name] =
      rule.op === "count"
        ? "count()"
        : `${OP_FN[rule.op]}(d[${JSON.stringify(field)}])`;
  }

  if (Object.keys(rollup).length === 0 && groupKeys.length === 0) {
    return rows;
  }

  try {
    let table = from(rows);
    if (groupKeys.length > 0) {
      const groupSpec: Record<string, string> = {};
      for (const key of groupKeys) {
        groupSpec[key] = `d[${JSON.stringify(key)}]`;
      }
      table = table.groupby(groupSpec);
    }
    table = table.rollup(rollup);
    return table.objects() as Row[];
  } catch {
    return [];
  }
}
