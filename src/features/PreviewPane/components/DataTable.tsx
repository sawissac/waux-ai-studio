"use client";

/**
 * Data table renderer for the Tool Builder's Table input node (preview-only).
 *
 * Built on TanStack Table (sorting, column resizing, pagination) with the
 * visible page virtualized via TanStack Virtual. The raw bound state value is
 * auto-optimized through {@link normalizeTableData} (typed cells, empty
 * rows/columns dropped) and every column sorts with a kind-aware comparator —
 * a→z natural strings, 0→9 numbers, auto-detected dates.
 */
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Table as TableIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TABLE_PAGE_SIZES } from "@/constants/tool-builder";
import { compareCells, formatCell, normalizeTableData } from "@/lib/table-data";
import { cn } from "@/lib/utils";
import type { TablePageSize } from "@/types/tool-builder";

/** Estimated row height (px) handed to the virtualizer. */
const ROW_HEIGHT = 33;

/** Max body height (px) before the page scrolls (and virtualizes). */
const BODY_MAX_HEIGHT = 440;

type Row = Record<string, unknown>;

/** Square icon button used by the pager (44px target on coarse pointers). */
function PagerButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md border border-input bg-background text-muted-foreground shadow-sm transition-colors duration-(--motion-duration-fast) hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:size-11"
    >
      {children}
    </button>
  );
}

/**
 * Render an arbitrary state value as an interactive data table.
 *
 * - **Auto-optimize** — input (array of objects / arrays, or a JSON string)
 *   is normalized once per value change; non-tabular input shows an empty
 *   placeholder instead of crashing.
 * - **Sorting** — click a header to cycle asc → desc → off. Comparator follows
 *   the column's detected kind; empty cells always sort last.
 * - **Resizing** — drag the header's right edge; double-click resets.
 * - **Pagination** — 30 / 50 / 100 rows per page (default from node config).
 * - **Virtualization** — only visible rows of the page are mounted; rows
 *   appear instantly (no per-row mount animation, per the interaction spec).
 *
 * @param props.value - Raw bound state value to display.
 * @param props.pageSize - Author-configured default rows per page.
 */
export function DataTable({
  value,
  pageSize,
}: {
  value: unknown;
  pageSize: TablePageSize;
}) {
  const data = useMemo(() => normalizeTableData(value), [value]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  // Follow the author's default page size; jump back to the first page.
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize });
  }, [pageSize]);

  // New data: back to page one, drop sorts pointing at vanished columns.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setSorting((s) =>
      s.filter((entry) => data.columns.some((c) => c.key === entry.id)),
    );
  }, [data]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      data.columns.map((col) => ({
        id: col.key,
        // Empty cells surface as `undefined` so `sortUndefined` pins them
        // last regardless of sort direction.
        accessorFn: (row: Row) => row[col.key] ?? undefined,
        header: col.label,
        sortUndefined: "last" as const,
        sortingFn: (a, b, id) =>
          compareCells(a.getValue(id), b.getValue(id), col.kind),
        cell: (info) => formatCell(info.getValue()),
        size: 160,
        minSize: 64,
        maxSize: 640,
      })),
    [data.columns],
  );

  const table = useReactTable({
    data: data.rows,
    columns,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    autoResetPageIndex: false,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: pageRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Page / sort changes swap the row set — snap the viewport back to the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pagination.pageIndex, pagination.pageSize, sorting]);

  if (data.columns.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 py-8 text-center text-xs text-muted-foreground">
        <TableIcon size={20} className="opacity-20" />
        <div>
          No tabular data in the bound state yet.
          <br />
          Bind an array (or JSON string) — e.g. from a CSV, JSON, or code node.
        </div>
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  const padTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const padBottom =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const total = data.rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="overflow-hidden rounded-xl border border-input shadow-sm">
      <div
        ref={scrollRef}
        style={{ maxHeight: BODY_MAX_HEIGHT }}
        className="overflow-auto overscroll-contain"
      >
        <table
          style={{ width: table.getCenterTotalSize() }}
          className="table-fixed border-separate border-spacing-0 text-xs"
        >
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="relative border-b border-border/60 bg-muted p-0 text-left font-semibold"
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        title="Sort column"
                        className="flex h-8 w-full items-center gap-1 px-2.5 transition-colors duration-(--motion-duration-fast) hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring pointer-coarse:h-11"
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                        {sorted === "asc" ? (
                          <ArrowUp size={12} className="shrink-0" />
                        ) : sorted === "desc" ? (
                          <ArrowDown size={12} className="shrink-0" />
                        ) : (
                          <ArrowUpDown
                            size={12}
                            className="shrink-0 opacity-30"
                          />
                        )}
                      </button>
                      {/* Drag to resize; double-click resets to default. */}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => header.column.resetSize()}
                        className={cn(
                          "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none transition-colors duration-(--motion-duration-fast)",
                          header.column.getIsResizing()
                            ? "bg-primary"
                            : "hover:bg-border",
                        )}
                      />
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {padTop > 0 && (
              <tr aria-hidden>
                <td style={{ height: padTop }} colSpan={columns.length} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = pageRows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="transition-colors duration-(--motion-duration-fast) hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="truncate border-b border-border/40 px-2.5 py-1.5 text-muted-foreground"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {padBottom > 0 && (
              <tr aria-hidden>
                <td style={{ height: padBottom }} colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
        <span>
          {total} row{total === 1 ? "" : "s"} · page {pagination.pageIndex + 1}{" "}
          of {Math.max(pageCount, 1)}
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className="h-8 w-18 text-xs pointer-coarse:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <PagerButton
              label="First page"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft size={14} />
            </PagerButton>
            <PagerButton
              label="Previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft size={14} />
            </PagerButton>
            <PagerButton
              label="Next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight size={14} />
            </PagerButton>
            <PagerButton
              label="Last page"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight size={14} />
            </PagerButton>
          </div>
        </div>
      </div>
    </div>
  );
}
