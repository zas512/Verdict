"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ColumnConfig,
  CustomTableProps,
  SortState
} from "@/types/tableTypes";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Inbox,
  Loader2
} from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";

function toDisplayString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function defaultCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return toDisplayString(a).localeCompare(toDisplayString(b), undefined, {
    sensitivity: "base"
  });
}

export function CustomTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  loadingLabel = "Loading...",
  emptyTitle = "No records found",
  emptyDescription = "Adjust filters or add a new record to begin.",
  emptyIcon,
  caption,
  onRowClick,
  pageSize = 8,
  onColumnOrderChange
}: Readonly<CustomTableProps<T>>) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    columns.map((c) => c.key)
  );
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({
    key: null,
    direction: null
  });
  const [pageIndex, setPageIndex] = useState(0);
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnConfig<T>>();
    columns.forEach((c) => {
      map.set(c.key, c);
    });
    return map;
  }, [columns]);

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((key) => columnMap.get(key))
        .filter((c): c is ColumnConfig<T> => Boolean(c)),
    [columnOrder, columnMap]
  );

  const sortedData = useMemo(() => {
    if (!sort.key || !sort.direction) {
      return data;
    }
    const col = columnMap.get(sort.key);
    if (!col) {
      return data;
    }
    const getValue = (row: T) =>
      col.accessor
        ? col.accessor(row)
        : (row as Record<string, unknown>)[col.key];
    const sorted = [...data].sort((a, b) => {
      if (col.sortFn) {
        return col.sortFn(a, b);
      }
      return defaultCompare(getValue(a), getValue(b));
    });
    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [data, sort, columnMap]);

  const handleSortClick = (colKey: string) => {
    setSort((prev) => {
      if (prev.key !== colKey) {
        return {
          key: colKey,
          direction: "asc"
        };
      }
      if (prev.direction === "asc") {
        return {
          key: colKey,
          direction: "desc"
        };
      }
      return {
        key: null,
        direction: null
      };
    });
    setPageIndex(0);
  };

  const pageCount = Math.max(1, Math.ceil(sortedData.length / pageSize));

  const paginatedData = useMemo(
    () =>
      sortedData.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [sortedData, pageIndex, pageSize]
  );

  const handleDragStart = (colKey: string) => (e: DragEvent) => {
    setDraggedKey(colKey);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (colKey: string) => (e: DragEvent) => {
    e.preventDefault();
    if (colKey !== draggedKey) {
      setDragOverKey(colKey);
    }
  };

  const handleDrop = (targetKey: string) => (e: DragEvent) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }
    setColumnOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggedKey);
      const toIndex = next.indexOf(targetKey);
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedKey);
      onColumnOrderChange?.(next);
      return next;
    });
    setDraggedKey(null);
    setDragOverKey(null);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  const alignClass = (align?: "left" | "center" | "right") => {
    if (align === "center") {
      return "text-center";
    }
    if (align === "right") {
      return "text-right";
    }
    return "text-left";
  };

  const justifyClass = (align?: "left" | "center" | "right") => {
    if (align === "center") {
      return "justify-center";
    }
    if (align === "right") {
      return "justify-end";
    }
    return "justify-start";
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3">
          <div className="border-border bg-background/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.04), inset_0_-2px_4px_rgba(0,0,0,0.35), 0_1px_2px_rgba(0,0,0,0.4) ] flex h-12 w-12 items-center justify-center rounded-xl border">
            <Loader2 className="text-primary h-5 w-5 animate-spin" />
          </div>

          <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            {loadingLabel}
          </p>
        </div>
      );
    }

    /*
     * ============================================================
     * EMPTY
     * ============================================================
     */

    if (sortedData.length === 0) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <div className="border-border bg-background/50 shadow-[ inset_0_1px_2px_rgba(255,255,255,0.04), inset_0_-2px_4px_rgba(0,0,0,0.35), 0_1px_2px_rgba(0,0,0,0.4) ] mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
            {emptyIcon ?? (
              <Inbox className="text-muted-foreground/60 h-5 w-5" />
            )}
          </div>

          <p className="text-foreground text-sm font-semibold">{emptyTitle}</p>

          <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-5">
            {emptyDescription}
          </p>
        </div>
      );
    }

    /*
     * ============================================================
     * TABLE
     * ============================================================
     */

    return (
      <table
        className="w-full min-w-[720px] table-auto border-collapse"
        aria-label={caption ?? undefined}
      >
        {caption && (
          <caption className="text-foreground sr-only text-left text-sm font-bold">
            {caption}
          </caption>
        )}

        {/* ========================================================
            TABLE HEADER
            ======================================================== */}

        <thead className="bg-background/40 shadow-[ inset_0_2px_5px_rgba(0,0,0,0.28), inset_0_-1px_0_rgba(255,255,255,0.025) ] relative">
          <tr className="border-border/80 border-b">
            {orderedColumns.map((col) => {
              const isSorted = sort.key === col.key;

              const isDragOver = dragOverKey === col.key;

              const isDragging = draggedKey === col.key;

              const renderSortIcon = () => {
                if (!isSorted) {
                  return (
                    <ArrowUpDown className="text-muted-foreground/50 group-hover/sort:text-muted-foreground size-3.5 transition-colors" />
                  );
                }

                if (sort.direction === "asc") {
                  return <ArrowUp className="text-primary size-3.5" />;
                }

                return <ArrowDown className="text-primary size-3.5" />;
              };

              return (
                <th
                  key={col.key}
                  scope="col"
                  draggable
                  onDragStart={handleDragStart(col.key)}
                  onDragOver={handleDragOver(col.key)}
                  onDrop={handleDrop(col.key)}
                  onDragEnd={handleDragEnd}
                  className={`text-muted-foreground/80 relative px-4 py-3.5 text-xs font-semibold tracking-[0.08em] whitespace-nowrap uppercase transition-colors select-none ${alignClass(col.align)} ${isDragOver ? "bg-primary/[0.07]" : ""} ${isDragging ? "opacity-30" : ""} `}
                >
                  {/* Drag-over indicator */}
                  {isDragOver && (
                    <span className="bg-primary/70 absolute inset-y-1 left-0 w-px shadow-[0_0_8px_rgba(212,169,79,0.4)]" />
                  )}

                  <div
                    className={`font-heading flex items-center gap-1.5 ${justifyClass(col.align)} `}
                  >
                    <GripVertical className="text-muted-foreground/30 hover:text-muted-foreground/70 size-3.5 shrink-0 cursor-grab transition-colors active:cursor-grabbing" />

                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(col.key)}
                        className="group/sort hover:text-foreground flex items-center gap-1.5 transition-colors"
                      >
                        <span>{col.header}</span>

                        {renderSortIcon()}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ========================================================
            TABLE BODY
            ======================================================== */}

        <tbody>
          {paginatedData.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              aria-label={onRowClick ? `View row ${rowKey(row)}` : undefined}
              className={`group border-border/60 border-b bg-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.012)] transition-colors duration-150 ${
                onRowClick
                  ? `hover:bg-muted/20 focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset`
                  : ""
              } `}
            >
              {orderedColumns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-4 align-middle text-sm ${alignClass(col.align)} `}
                >
                  {col.render
                    ? col.render(row)
                    : toDisplayString(
                        (row as Record<string, unknown>)[col.key]
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <Card className="border-border bg-card text-card-foreground shadow-[ 0_1px_0_rgba(255,255,255,0.07), 0_2px_3px_rgba(0,0,0,0.65), 0_8px_20px_rgba(0,0,0,0.28) ] relative gap-0 overflow-hidden rounded-xl border p-0">
      {/* ============================================================
          TOP / LEFT HIGHLIGHT
          ============================================================ */}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-t border-l border-white/[0.07]"
      />

      {/* ============================================================
          BOTTOM / RIGHT EDGE
          ============================================================ */}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-r border-b border-black/50"
      />

      {/* ============================================================
          INNER SURFACE SHADOW
          ============================================================ */}

      <div
        aria-hidden
        className="shadow-[ inset_0_1px_2px_rgba(255,255,255,0.025), inset_0_-2px_5px_rgba(0,0,0,0.28) ] pointer-events-none absolute inset-px z-20 rounded-[11px]"
      />

      <div className="relative z-10">
        <div className="overflow-x-auto">{renderTableBody()}</div>

        {/* ========================================================
            PAGINATION
            ======================================================== */}

        {!isLoading && sortedData.length > 0 && (
          <div className="border-border/80 bg-background/30 shadow-[ inset_0_2px_4px_rgba(0,0,0,0.25), inset_0_1px_0_rgba(255,255,255,0.02) ] flex items-center justify-between border-t px-4 py-3.5">
            <span className="text-muted-foreground text-xs font-medium">
              Showing page{" "}
              <span className="text-foreground font-semibold">
                {pageIndex + 1}
              </span>{" "}
              of {pageCount}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="border-border/80 bg-card shadow-[ 0_1px_2px_rgba(0,0,0,0.3), inset_0_1px_0_rgba(255,255,255,0.025) ] hover:bg-muted/40 h-8 w-8 rounded-md transition-all active:translate-y-px active:shadow-none disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="border-primary/20 bg-primary/[0.08] text-primary shadow-[ inset_0_1px_0_rgba(255,255,255,0.025), 0_1px_2px_rgba(0,0,0,0.3) ] flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold">
                {pageIndex + 1}
              </div>

              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                onClick={() =>
                  setPageIndex((p) => Math.min(pageCount - 1, p + 1))
                }
                disabled={pageIndex >= pageCount - 1}
                className="border-border/80 bg-card shadow-[ 0_1px_2px_rgba(0,0,0,0.3), inset_0_1px_0_rgba(255,255,255,0.025) ] hover:bg-muted/40 h-8 w-8 rounded-md transition-all active:translate-y-px active:shadow-none disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
