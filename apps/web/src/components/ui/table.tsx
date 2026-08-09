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
  if (value instanceof Date) return value.toLocaleDateString();
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
  const [sort, setSort] = useState<SortState>({ key: null, direction: null });
  const [pageIndex, setPageIndex] = useState(0);

  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnConfig<T>>();
    columns.forEach((c) => map.set(c.key, c));
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
    if (!sort.key || !sort.direction) return data;
    const col = columnMap.get(sort.key);
    if (!col) return data;
    const getValue = (row: T) =>
      col.accessor
        ? col.accessor(row)
        : (row as Record<string, unknown>)[col.key];
    const sorted = [...data].sort((a, b) => {
      if (col.sortFn) return col.sortFn(a, b);
      return defaultCompare(getValue(a), getValue(b));
    });
    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [data, sort, columnMap]);

  const handleSortClick = (colKey: string) => {
    setSort((prev) => {
      if (prev.key !== colKey) return { key: colKey, direction: "asc" };
      if (prev.direction === "asc") return { key: colKey, direction: "desc" };
      return { key: null, direction: null };
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
    if (colKey !== draggedKey) setDragOverKey(colKey);
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
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  const justifyClass = (align?: "left" | "center" | "right") => {
    if (align === "center") return "justify-center";
    if (align === "right") return "justify-end";
    return "justify-start";
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
            {loadingLabel}
          </p>
        </div>
      );
    }

    if (sortedData.length === 0) {
      return (
        <div className="text-center p-16 space-y-2">
          {emptyIcon ?? (
            <Inbox className="h-12 w-12 text-muted-foreground/60 mx-auto" />
          )}
          <p className="font-bold text-foreground text-base">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      );
    }

    const allColumnsHaveWidths =
      orderedColumns.length > 0 &&
      orderedColumns.every((col) => col.width !== undefined);
    const tableLayoutClass = allColumnsHaveWidths
      ? "table-fixed"
      : "table-auto";

    return (
      <table
        className={`border-collapse ${tableLayoutClass}`}
        aria-label={caption ?? undefined}
      >
        {caption && (
          <caption className="sr-only text-left text-sm font-bold text-foreground">
            {caption}
          </caption>
        )}
        <colgroup>
          {orderedColumns.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead className="bg-muted/10">
          <tr className="border-b border-border">
            {orderedColumns.map((col) => {
              const isSorted = sort.key === col.key;
              const isDragOver = dragOverKey === col.key;
              const isDragging = draggedKey === col.key;

              return (
                <th
                  key={col.key}
                  scope="col"
                  draggable
                  onDragStart={handleDragStart(col.key)}
                  onDragOver={handleDragOver(col.key)}
                  onDrop={handleDrop(col.key)}
                  onDragEnd={handleDragEnd}
                  className={`text-sm font-bold uppercase tracking-wider text-foreground/80 py-4 px-4 select-none whitespace-nowrap transition-colors ${
                    isDragOver ? "bg-primary/10" : ""
                  } ${isDragging ? "opacity-40" : ""}`}
                >
                  {(() => {
                    const renderSortIcon = () => {
                      if (!isSorted) {
                        return (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/80 hover:cursor-pointer" />
                        );
                      }
                      if (sort.direction === "asc") {
                        return (
                          <ArrowUp className="h-3.5 w-3.5 text-primary hover:cursor-pointer" />
                        );
                      }
                      return (
                        <ArrowDown className="h-3.5 w-3.5 text-primary hover:cursor-pointer" />
                      );
                    };

                    return (
                      <div
                        className={`flex items-center gap-1.5 ${alignClass(
                          col.align
                        )} ${justifyClass(col.align)}`}
                      >
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab shrink-0 hover:cursor-grab" />
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSortClick(col.key)}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <span>{col.header}</span>
                            {renderSortIcon()}
                          </button>
                        ) : (
                          <span>{col.header}</span>
                        )}
                      </div>
                    );
                  })()}
                </th>
              );
            })}
          </tr>
        </thead>
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
              aria-label={
                onRowClick ? `View row ${rowKey(row)}` : undefined
              }
              className={`border-b border-border hover:bg-muted/30 transition-colors ${
                onRowClick
                  ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  : ""
              }`}
            >
              {orderedColumns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 align-middle text-sm ${alignClass(col.align)}`}
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
    <Card className="overflow-hidden bg-card text-card-foreground p-0 gap-0">
      <div className="overflow-x-auto">{renderTableBody()}</div>
      {/* Pagination controls */}
      {!isLoading && sortedData.length > 0 && (
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
          <span className="text-sm font-semibold text-muted-foreground">
            Showing page {pageIndex + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="h-8 w-8 rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              onClick={() =>
                setPageIndex((p) => Math.min(pageCount - 1, p + 1))
              }
              disabled={pageIndex >= pageCount - 1}
              className="h-8 w-8 rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
