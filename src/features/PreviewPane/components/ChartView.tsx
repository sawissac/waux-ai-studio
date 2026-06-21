"use client";

/**
 * d3 chart renderer for the Tool Builder's Chart node (preview-only).
 *
 * The bound state value is normalized once via {@link normalizeTableData} — the
 * same auto-optimizing pass the Table node uses (typed cells, empty rows/columns
 * dropped, per-column kind detected). Columns then auto-resolve: the first
 * text/date column becomes the category (X) axis and every numeric column
 * becomes a value (Y) series, unless the node overrides them. Bars, lines,
 * areas, pies, and scatter plots are drawn imperatively with d3 into an SVG
 * that resizes to the container width via a ResizeObserver. Hover any mark for
 * a native tooltip; the chart never writes back to state.
 */
import {
  arc,
  area as d3area,
  axisBottom,
  axisLeft,
  line as d3line,
  pie as d3pie,
  type PieArcDatum,
  scaleBand,
  scaleLinear,
  scalePoint,
  select,
  type Selection,
} from "d3";
import { BarChart3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import {
  formatCell,
  normalizeTableData,
  type TableColumn,
  type TableData,
} from "@/lib/table-data";
import type { ChartNode } from "@/types/tool-builder";

/** Categorical series palette (reads on both light & dark surfaces). */
const PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
];

/** Series/category color by index, cycling the palette. */
const colorAt = (i: number): string => PALETTE[i % PALETTE.length];

/** Plot margins (px) for cartesian charts: room for axes. */
const M = { top: 10, right: 14, bottom: 28, left: 46 };

/** Horizontal space consumed by the card's border + padding (`p-3`). */
const CARD_INSET = 26;

type AnyGroup = Selection<SVGGElement, unknown, null, undefined>;
type AnySvg = Selection<SVGSVGElement, unknown, null, undefined>;

/** Tooltip element + its positioned ancestor, threaded through draw functions. */
interface TooltipCtx {
  el: HTMLDivElement | null;
  container: HTMLElement | null;
}

/** Structured payload for one tooltip instance. */
interface TipData {
  /** Primary row / category label. */
  label: string;
  /** Series name shown above the label (omit for single-series charts). */
  series?: string;
  /** Formatted numeric value. */
  value: string;
  /** Secondary annotation (e.g. percentage for pie slices). */
  sub?: string;
  /** Series / slice color for the swatch. */
  color?: string;
}

/** Returns show / move / hide helpers that imperatively drive the tooltip div. */
function tipHandlers(tip: TooltipCtx) {
  const show = (data: TipData) => {
    if (!tip.el) {return;}
    const el = tip.el;
    while (el.firstChild) {el.removeChild(el.firstChild);}

    // Series row (color swatch + series name) — only for multi-series charts.
    if (data.series) {
      const header = document.createElement("div");
      header.style.cssText =
        "display:flex;align-items:center;gap:5px;margin-bottom:3px";
      if (data.color) {
        const dot = document.createElement("span");
        dot.style.cssText = `width:7px;height:7px;border-radius:2px;flex-shrink:0;background:${data.color}`;
        header.appendChild(dot);
      }
      const seriesEl = document.createElement("span");
      seriesEl.textContent = data.series;
      seriesEl.style.cssText = "font-size:10px;opacity:0.55;font-weight:500";
      header.appendChild(seriesEl);
      el.appendChild(header);
    }

    // Category / row label.
    const labelEl = document.createElement("div");
    labelEl.textContent = data.label;
    labelEl.style.cssText =
      "font-size:11px;font-weight:600;margin-bottom:3px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    el.appendChild(labelEl);

    // Value row: [color dot for single-series] + value + optional sub.
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:baseline;gap:5px";

    if (data.color && !data.series) {
      const dot = document.createElement("span");
      dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:2px;flex-shrink:0;align-self:center;background:${data.color}`;
      row.appendChild(dot);
    }

    const valEl = document.createElement("span");
    valEl.textContent = data.value;
    valEl.style.cssText =
      "font-size:13px;font-weight:700;letter-spacing:-0.01em;font-variant-numeric:tabular-nums";
    row.appendChild(valEl);

    if (data.sub) {
      const subEl = document.createElement("span");
      subEl.textContent = data.sub;
      subEl.style.cssText = "font-size:10px;opacity:0.5";
      row.appendChild(subEl);
    }

    el.appendChild(row);
    el.style.opacity = "0";
    el.style.display = "block";
    requestAnimationFrame(() => {
      if (tip.el) {tip.el.style.opacity = "1";}
    });
  };

  const move = (e: MouseEvent) => {
    if (!tip.el || !tip.container) {return;}
    const rect = tip.container.getBoundingClientRect();
    const x = e.clientX - rect.left + 14;
    const y = e.clientY - rect.top - 44;
    // Clamp horizontally so tooltip doesn't overflow the container.
    const maxX = rect.width - tip.el.offsetWidth - 8;
    tip.el.style.left = `${Math.min(x, Math.max(0, maxX))}px`;
    tip.el.style.top = `${Math.max(4, y)}px`;
  };

  const hide = () => {
    if (!tip.el) {return;}
    tip.el.style.opacity = "0";
    tip.el.style.display = "none";
  };

  return { show, move, hide };
}

/** One resolved value series across all rows. */
interface Series {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
}

/** Everything `draw` needs, derived once from the node + normalized data. */
interface Resolved {
  rows: Record<string, unknown>[];
  /** Category column (X), or null → fall back to the row index. */
  xCol: TableColumn | null;
  /** One tick label per row. */
  labels: string[];
  /** Value series (Y). */
  series: Series[];
  /** Numeric columns available (drives pie/scatter resolution). */
  numeric: TableColumn[];
}

/** Coerce a normalized cell to a finite number, or null. */
function num(v: unknown): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Compact number format for axis ticks & tooltips. */
function fmtNum(n: number): string {
  if (!Number.isFinite(n)) {
    return "";
  }
  return Number.isInteger(n) ? String(n) : Number(n.toFixed(2)).toString();
}

/** True when a normalized cell holds no value. */
function isEmpty(v: unknown): boolean {
  return (
    v === null || v === undefined || (typeof v === "string" && v.trim() === "")
  );
}

/**
 * Auto-resolve what to plot, then aggregate it by category.
 *
 * Columns default sensibly — the first text/date column is the category (X)
 * axis and numeric columns are the value (Y) series — and `xField`/`yFields`
 * override them. Rows are then grouped by their X label and each series is
 * reduced per group: numeric columns are SUMMED, non-numeric columns are
 * COUNTED (so a text column like a name plots how many rows fall in each
 * category). With no value column at all, a single "Count" series counts the
 * rows per category. (Scatter ignores this — it plots one point per row.)
 */
function resolve(node: ChartNode, data: TableData): Resolved {
  const { columns, rows } = data;
  const byKey = (k: string) => columns.find((c) => c.key === k) ?? null;
  const numeric = columns.filter((c) => c.kind === "number");

  let xCol: TableColumn | null = node.xField ? byKey(node.xField) : null;
  if (!xCol) {
    xCol =
      columns.find((c) => c.kind === "string") ??
      columns.find((c) => c.kind === "date") ??
      columns.find((c) => c.kind !== "number") ??
      null;
  }

  let yCols: TableColumn[];
  if (node.yFields.length) {
    yCols = node.yFields.map(byKey).filter((c): c is TableColumn => c !== null);
  } else {
    // Numeric columns, never the category column itself (avoids plotting a
    // numeric X against itself). Empty here falls through to a row count.
    yCols = numeric.filter((c) => c.key !== xCol?.key);
  }

  // Group row indices by their X label (first-seen order).
  const labels: string[] = [];
  const groups = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const label = xCol
      ? formatCell(r[xCol.key]) || String(i + 1)
      : String(i + 1);
    const bucket = groups.get(label);
    if (bucket) {
      bucket.push(i);
    } else {
      groups.set(label, [i]);
      labels.push(label);
    }
  });

  /** Reduce one column to a per-category value (sum if numeric, else count). */
  const seriesFor = (col: TableColumn, colorIdx: number): Series => {
    const counting = col.kind !== "number";
    const values = labels.map((label) => {
      const idxs = groups.get(label) ?? [];
      if (counting) {
        return idxs.reduce(
          (n, i) => n + (isEmpty(rows[i][col.key]) ? 0 : 1),
          0,
        );
      }
      let sum = 0;
      let seen = false;
      for (const i of idxs) {
        const v = num(rows[i][col.key]);
        if (v !== null) {
          sum += v;
          seen = true;
        }
      }
      return seen ? sum : null;
    });
    return {
      key: col.key,
      label: counting ? `${col.label} (count)` : col.label,
      color: colorAt(colorIdx),
      values,
    };
  };

  let series: Series[];
  if (yCols.length) {
    series = yCols.map((c, i) => seriesFor(c, i));
  } else if (xCol) {
    series = [
      {
        key: "__count__",
        label: "Count",
        color: colorAt(0),
        values: labels.map((label) => (groups.get(label) ?? []).length),
      },
    ];
  } else {
    series = [];
  }

  return { rows, xCol, labels, series, numeric };
}

/** Resolve the two numeric axes for a scatter plot (X may be null → index). */
function scatterAxes(
  node: ChartNode,
  resolved: Resolved,
): { x: TableColumn | null; y: TableColumn | null } {
  const { numeric } = resolved;
  const byKey = (k: string) => numeric.find((c) => c.key === k) ?? null;
  let x = node.xField ? byKey(node.xField) : null;
  let y = node.yFields[0] ? byKey(node.yFields[0]) : null;
  if (!x && !y) {
    if (numeric.length >= 2) {
      [x, y] = [numeric[0], numeric[1]];
    } else {
      y = numeric[0] ?? null; // single numeric → plot it against the index
    }
  } else {
    if (!x) {
      x = numeric.find((c) => c.key !== y?.key) ?? null;
    }
    if (!y) {
      y = numeric.find((c) => c.key !== x?.key) ?? numeric[0] ?? null;
    }
  }
  // Never plot one column against itself: prefer a distinct Y, else drop X to
  // the row index (the single-numeric-column case).
  const xk = x?.key;
  if (xk !== undefined && xk === y?.key) {
    const other = numeric.find((c) => c.key !== xk);
    if (other) {
      y = other;
    } else {
      x = null;
    }
  }
  return { x, y };
}

/** Tone d3-rendered axis text/lines to the surrounding muted theme color. */
function styleAxis(g: AnyGroup): void {
  g.selectAll("text")
    .attr("fill", "currentColor")
    .attr("fill-opacity", 0.7)
    .style("font-size", "10px");
  g.selectAll("line")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.25);
  g.selectAll(".domain")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.25);
}

/** Thin category ticks so labels don't overlap on a narrow chart. */
function tickSubset(labels: string[], innerW: number): string[] {
  const maxTicks = Math.max(2, Math.floor(innerW / 56));
  if (labels.length <= maxTicks) {
    return labels;
  }
  const step = Math.ceil(labels.length / maxTicks);
  return labels.filter((_, i) => i % step === 0);
}

/** Bar (grouped) / line / area — share the cartesian frame. */
function drawCartesian(
  svg: AnySvg,
  node: ChartNode,
  resolved: Resolved,
  width: number,
  height: number,
  tip: TooltipCtx,
): void {
  const { show, move, hide } = tipHandlers(tip);
  const { labels, series } = resolved;
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = Math.max(0, height - M.top - M.bottom);
  const root = svg
    .append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  const vals = series
    .flatMap((s) => s.values)
    .filter((v): v is number => v !== null);
  const dMax = Math.max(0, ...(vals.length ? vals : [0]));
  const dMin = Math.min(0, ...(vals.length ? vals : [0]));
  const y = scaleLinear().domain([dMin, dMax]).nice().range([innerH, 0]);

  if (node.showGrid) {
    root
      .append("g")
      .selectAll("line")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.12);
  }

  styleAxis(
    root.append("g").call(
      axisLeft(y)
        .ticks(5)
        .tickFormat((d) => fmtNum(Number(d))),
    ),
  );

  if (node.chartType === "bar") {
    const x0 = scaleBand<string>()
      .domain(labels)
      .range([0, innerW])
      .paddingInner(0.2)
      .paddingOuter(0.1);
    const x1 = scaleBand<string>()
      .domain(series.map((s) => s.key))
      .range([0, x0.bandwidth()])
      .padding(0.06);

    labels.forEach((label, ri) => {
      const group = root
        .append("g")
        .attr("transform", `translate(${x0(label) ?? 0},0)`);
      series.forEach((s) => {
        const v = s.values[ri];
        if (v === null) {
          return;
        }
        const top = Math.min(y(v), y(0));
        const h = Math.abs(y(v) - y(0));
        group
          .append("rect")
          .attr("x", x1(s.key) ?? 0)
          .attr("y", top)
          .attr("width", x1.bandwidth())
          .attr("height", h)
          .attr("rx", 2)
          .attr("fill", s.color)
          .on("mouseover", () =>
            show({ label, series: s.label, value: fmtNum(v), color: s.color }),
          )
          .on("mousemove", (e: MouseEvent) => move(e))
          .on("mouseout", hide);
      });
    });

    styleAxis(
      root
        .append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(
          axisBottom(x0)
            .tickValues(tickSubset(labels, innerW))
            .tickSizeOuter(0),
        ),
    );
    return;
  }

  // line / area
  const x = scalePoint<string>().domain(labels).range([0, innerW]).padding(0.5);
  type Pt = { x: number; y: number; v: number; label: string } | null;
  series.forEach((s) => {
    const pts: Pt[] = labels.map((label, ri) => {
      const v = s.values[ri];
      return v === null ? null : { x: x(label) ?? 0, y: y(v), v, label };
    });
    const defined = (p: Pt): p is NonNullable<Pt> => p !== null;
    if (!pts.some(defined)) {
      return;
    }
    if (node.chartType === "area") {
      const areaGen = d3area<Pt>()
        .defined(defined)
        .x((p) => p!.x)
        .y0(y(0))
        .y1((p) => p!.y);
      root
        .append("path")
        .datum(pts)
        .attr("d", areaGen)
        .attr("fill", s.color)
        .attr("fill-opacity", 0.25);
    }
    const lineGen = d3line<Pt>()
      .defined(defined)
      .x((p) => p!.x)
      .y((p) => p!.y);
    root
      .append("path")
      .datum(pts)
      .attr("d", lineGen)
      .attr("fill", "none")
      .attr("stroke", s.color)
      .attr("stroke-width", 2);
    pts.forEach((p) => {
      if (!p) {return;}
      root
        .append("circle")
        .attr("cx", p.x)
        .attr("cy", p.y)
        .attr("r", 3)
        .attr("fill", s.color)
        .on("mouseover", () =>
          show({
            label: p.label,
            series: s.label,
            value: fmtNum(p.v),
            color: s.color,
          }),
        )
        .on("mousemove", (e: MouseEvent) => move(e))
        .on("mouseout", hide);
    });
  });

  styleAxis(
    root
      .append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        axisBottom(x).tickValues(tickSubset(labels, innerW)).tickSizeOuter(0),
      ),
  );
}

/** Scatter — first two numeric columns (or the index) as X / Y. */
function drawScatter(
  svg: AnySvg,
  node: ChartNode,
  resolved: Resolved,
  width: number,
  height: number,
  tip: TooltipCtx,
): void {
  const { show, move, hide } = tipHandlers(tip);
  const { x: xCol, y: yCol } = scatterAxes(node, resolved);
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = Math.max(0, height - M.top - M.bottom);
  const root = svg
    .append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  const pts = resolved.rows
    .map((r, i) => {
      const xv = xCol ? num(r[xCol.key]) : i + 1;
      const yv = yCol ? num(r[yCol.key]) : null;
      if (xv === null || yv === null) {
        return null;
      }
      const label = resolved.xCol
        ? formatCell(r[resolved.xCol.key]) || String(i + 1)
        : String(i + 1);
      return { xv, yv, label };
    })
    .filter((p): p is { xv: number; yv: number; label: string } => p !== null);
  if (!pts.length) {
    return;
  }

  const xs = pts.map((p) => p.xv);
  const ys = pts.map((p) => p.yv);
  const x = scaleLinear()
    .domain([Math.min(...xs), Math.max(...xs)])
    .nice()
    .range([0, innerW]);
  const y = scaleLinear()
    .domain([Math.min(...ys), Math.max(...ys)])
    .nice()
    .range([innerH, 0]);

  if (node.showGrid) {
    root
      .append("g")
      .selectAll("line")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.12);
  }

  pts.forEach((p) => {
    root
      .append("circle")
      .attr("cx", x(p.xv))
      .attr("cy", y(p.yv))
      .attr("r", 3.5)
      .attr("fill", colorAt(0))
      .attr("fill-opacity", 0.75)
      .on("mouseover", () =>
        show({
          label: p.label,
          value: `${fmtNum(p.xv)}, ${fmtNum(p.yv)}`,
          color: colorAt(0),
        }),
      )
      .on("mousemove", (e: MouseEvent) => move(e))
      .on("mouseout", hide);
  });

  styleAxis(
    root
      .append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        axisBottom(x)
          .ticks(Math.max(2, Math.floor(innerW / 64)))
          .tickFormat((d) => fmtNum(Number(d)))
          .tickSizeOuter(0),
      ),
  );
  styleAxis(
    root.append("g").call(
      axisLeft(y)
        .ticks(5)
        .tickFormat((d) => fmtNum(Number(d))),
    ),
  );

  // Column name labels on both axes.
  const xAxisLabel = xCol?.label ?? "index";
  const yAxisLabel = yCol?.label ?? "value";
  root
    .append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 22)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("fill-opacity", 0.5)
    .style("font-size", "10px")
    .text(xAxisLabel);
  root
    .append("text")
    .attr("transform", `translate(-38,${innerH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("fill-opacity", 0.5)
    .style("font-size", "10px")
    .text(yAxisLabel);
}

/**
 * Pie — slices sized by the first value series (already aggregated per
 * category in {@link resolve}: summed for a numeric column, counted for a
 * text one). Only positive magnitudes can be drawn.
 */
function drawPie(
  svg: AnySvg,
  resolved: Resolved,
  width: number,
  height: number,
  tip: TooltipCtx,
): void {
  const { show, move, hide } = tipHandlers(tip);
  const s = resolved.series[0];
  if (!s) {
    return;
  }
  const slices = resolved.labels
    .map((label, i) => ({ label, value: s.values[i] }))
    .filter(
      (d): d is { label: string; value: number } =>
        d.value !== null && d.value > 0,
    );
  if (!slices.length) {
    return;
  }
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  // Leave 28 px on each side for outer labels.
  const r = Math.max(0, Math.min(width, height) / 2 - 28);
  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);
  const arcs = d3pie<{ label: string; value: number }>()
    .value((d) => d.value)
    .sort(null)(slices);
  const arcGen = arc<PieArcDatum<{ label: string; value: number }>>()
    .innerRadius(0)
    .outerRadius(r);
  const innerLabel = arc<PieArcDatum<{ label: string; value: number }>>()
    .innerRadius(r * 0.6)
    .outerRadius(r * 0.6);
  const outerLabel = arc<PieArcDatum<{ label: string; value: number }>>()
    .innerRadius(r + 18)
    .outerRadius(r + 18);

  arcs.forEach((a, i) => {
    const pct = (a.data.value / total) * 100;
    g.append("path")
      .attr("d", arcGen(a) ?? "")
      .attr("fill", colorAt(i))
      .style("stroke", "var(--background)")
      .style("stroke-width", "2px")
      .on("mouseover", () =>
        show({
          label: a.data.label,
          value: fmtNum(a.data.value),
          sub: `${pct.toFixed(1)}%`,
          color: colorAt(i),
        }),
      )
      .on("mousemove", (e: MouseEvent) => move(e))
      .on("mouseout", hide);

    // Inner % label for large-enough slices.
    if (pct >= 6 && r > 40) {
      const [lx, ly] = innerLabel.centroid(a);
      g.append("text")
        .attr("x", lx)
        .attr("y", ly)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#fff")
        .style("font-size", "10px")
        .style("font-weight", "600")
        .text(`${Math.round(pct)}%`);
    }

    // Outer category label + leader line for slices >= 5%.
    if (pct >= 5 && r > 20) {
      const midAngle = (a.startAngle + a.endAngle) / 2;
      const [ox, oy] = outerLabel.centroid(a);
      g.append("line")
        .attr("x1", Math.sin(midAngle) * (r + 3))
        .attr("y1", -Math.cos(midAngle) * (r + 3))
        .attr("x2", Math.sin(midAngle) * (r + 14))
        .attr("y2", -Math.cos(midAngle) * (r + 14))
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.35)
        .attr("stroke-width", 1);
      const raw = a.data.label;
      g.append("text")
        .attr("x", ox)
        .attr("y", oy)
        .attr("text-anchor", ox > 0 ? "start" : "end")
        .attr("dominant-baseline", "middle")
        .attr("fill", "currentColor")
        .attr("fill-opacity", 0.75)
        .style("font-size", "9px")
        .text(raw.length > 14 ? `${raw.slice(0, 13)}…` : raw);
    }
  });
}

/** Dispatch to the right d3 renderer for the node's chart type. */
function draw(
  svgEl: SVGSVGElement,
  node: ChartNode,
  resolved: Resolved,
  width: number,
  height: number,
  tip: TooltipCtx,
): void {
  const svg = select(svgEl);
  svg.selectAll("*").remove();
  if (width <= 0 || height <= 0) {
    return;
  }
  if (node.chartType === "pie") {
    drawPie(svg, resolved, width, height, tip);
  } else if (node.chartType === "scatter") {
    drawScatter(svg, node, resolved, width, height, tip);
  } else {
    drawCartesian(svg, node, resolved, width, height, tip);
  }
}

/** Colored chips for each series (cartesian) or category (pie). */
function Legend({
  node,
  resolved,
}: {
  node: ChartNode;
  resolved: Resolved;
}): React.ReactElement | null {
  let items: { label: string; color: string }[];
  if (node.chartType === "pie") {
    const vals = resolved.series[0]?.values ?? [];
    const slices = resolved.labels.filter((_, i) => {
      const v = vals[i];
      return v !== null && v > 0;
    });
    items = slices
      .slice(0, 16)
      .map((label, i) => ({ label, color: colorAt(i) }));
    if (slices.length > 16) {
      items.push({ label: `+${slices.length - 16}`, color: "transparent" });
    }
  } else if (node.chartType === "scatter") {
    const { x, y } = scatterAxes(node, resolved);
    items = [
      {
        label: `${y?.label ?? "y"} / ${x?.label ?? "index"}`,
        color: colorAt(0),
      },
    ];
  } else {
    items = resolved.series.map((s) => ({ label: s.label, color: s.color }));
  }
  if (!items.length) {
    return null;
  }
  return (
    <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
      {items.map((it, i) => (
        <span
          key={`${it.label}-${i}`}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: it.color }}
          />
          <span className="truncate">{it.label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Render an arbitrary state value as an interactive d3 chart.
 *
 * @param props.node - The Chart node config (type, field overrides, options).
 * @param props.value - Raw bound state value to plot.
 */
export function ChartView({
  node,
  value,
}: {
  node: ChartNode;
  value: unknown;
}): React.ReactElement {
  const { t } = useTranslation();
  const data = useMemo(() => normalizeTableData(value), [value]);
  const resolved = useMemo(
    () => resolve(node, data),
    [node.xField, node.yFields, node.chartType, data],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0]?.contentRect.width ?? 0));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = node.height;
  const chartW = Math.max(0, width - CARD_INSET);

  // Scatter needs a numeric column to place points; every other chart type
  // needs a value series (numeric sum or a non-numeric count).
  const plottable =
    data.columns.length > 0 &&
    (node.chartType === "scatter"
      ? resolved.numeric.length > 0
      : resolved.series.length > 0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !plottable) {
      if (tooltipRef.current) {tooltipRef.current.style.display = "none";}
      return;
    }
    const tip: TooltipCtx = {
      el: tooltipRef.current,
      container: wrapRef.current,
    };
    draw(svg, node, resolved, chartW, height, tip);
    return () => {
      select(svg).selectAll("*").remove();
      if (tooltipRef.current) {tooltipRef.current.style.display = "none";}
    };
  }, [node, resolved, chartW, height, plottable]);

  return (
    <div ref={wrapRef} className="relative w-full">
      {plottable ? (
        <div className="rounded-xl border border-input bg-card/30 p-3 shadow-sm">
          {node.showLegend && <Legend node={node} resolved={resolved} />}
          <svg
            ref={svgRef}
            width={chartW}
            height={height}
            role="img"
            aria-label={node.fieldLabel}
            className="block text-muted-foreground"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 py-8 text-center text-xs text-muted-foreground">
          <BarChart3 size={20} className="opacity-20" />
          <span className="max-w-xs">{t("chart.empty")}</span>
        </div>
      )}
      <div
        ref={tooltipRef}
        style={{
          display: "none",
          opacity: 0,
          transition: "opacity 120ms ease",
        }}
        className="pointer-events-none absolute z-20 min-w-30 rounded-lg border border-border/60 bg-popover/95 px-3 py-2.5 text-popover-foreground shadow-lg backdrop-blur-sm"
      />
    </div>
  );
}
