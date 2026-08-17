"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ColumnConfig,
  CustomTableProps,
  SortState,
} from "@/types/tableTypes";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";

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
    sensitivity: "base",
  });
}

function CustomTableLoading({
  loadingLabel,
}: Readonly<{
  loadingLabel: string;
}>) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl">
        <Loader2 className="text-primary h-5 w-5 animate-spin" />
      </div>
      <p className="text-foreground/90 text-xs font-bold tracking-[0.14em] uppercase">
        {loadingLabel}
      </p>
    </div>
  );
}

interface CustomTableEmptyProps {
  emptyIcon?: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}

function CustomTableEmpty({
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: Readonly<CustomTableEmptyProps>) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="border-border bg-background/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.04), inset_0_-2px_4px_rgba(0,0,0,0.35), 0_1px_2px_rgba(0,0,0,0.4)] mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
        {emptyIcon ?? <Inbox className="text-muted-foreground/80 h-5 w-5" />}
      </div>
      <p className="text-foreground text-sm font-bold">{emptyTitle}</p>
      <p className="text-foreground/75 mt-1 max-w-sm text-xs leading-5">
        {emptyDescription}
      </p>
    </div>
  );
}

type alignClass = "left" | "center" | "right";

interface CustomTableHeaderProps<T> {
  columns: ColumnConfig<T>[];
  sort: SortState;
  alignClass: (align?: alignClass) => string;
  justifyClass: (align?: alignClass) => string;
  onSortClick: (colKey: string) => void;
}

function CustomTableHeader<T>({
  columns,
  sort,
  alignClass,
  justifyClass,
  onSortClick,
}: Readonly<CustomTableHeaderProps<T>>) {
  return (
    <thead className="bg-background/45 border-border/80 relative border-b shadow-[inset_0_-1px_0_rgba(255,255,255,0.015)]">
      <tr className="border-border/80 border-b">
        {columns.map((col) => {
          const isSorted = sort.key === col.key;

          const renderSortIcon = () => {
            if (!isSorted) {
              return (
                <ArrowUpDown className="text-muted-foreground/60 group-hover/sort:text-foreground size-3.5 transition-colors" />
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
              className={`text-foreground/85 relative h-14 px-4 py-0 align-middle text-xs font-bold tracking-[0.08em] whitespace-nowrap uppercase transition-colors select-none ${alignClass(col.align)}`}
            >
              <div
                className={`font-heading flex items-center gap-1.5 ${justifyClass(col.align)} `}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSortClick(col.key)}
                    className="group/sort hover:text-foreground text-foreground/85 flex items-center gap-1.5 font-bold transition-colors"
                  >
                    <span>{col.header}</span>
                    {renderSortIcon()}
                  </button>
                ) : (
                  <span className="text-foreground/85 font-bold">
                    {col.header}
                  </span>
                )}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

interface CustomTableBodyProps<T> {
  paginatedData: T[];
  columns: ColumnConfig<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  alignClass: (align?: alignClass) => string;
}

function CustomTableBody<T>({
  paginatedData,
  columns,
  rowKey,
  onRowClick,
  alignClass,
}: Readonly<CustomTableBodyProps<T>>) {
  return (
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
          {columns.map((col) => (
            <td
              key={col.key}
              className={`text-foreground/90 px-4 py-4 align-middle text-sm ${alignClass(col.align)} `}
            >
              {col.render
                ? col.render(row)
                : toDisplayString((row as Record<string, unknown>)[col.key])}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

interface CustomTablePaginationProps {
  pageIndex: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrev: boolean;
  canNext: boolean;
}

function CustomTablePagination({
  pageIndex,
  pageCount,
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
}: Readonly<CustomTablePaginationProps>) {
  return (
    <div className="border-border/80 bg-background/45 flex h-14 items-center justify-between border-t px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]">
      <span className="text-foreground/80 text-xs font-bold tracking-wide">
        Showing page{" "}
        <span className="text-foreground font-extrabold">{pageIndex + 1}</span>{" "}
        of <span className="text-foreground font-extrabold">{pageCount}</span>
      </span>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          onClick={onPrevPage}
          disabled={!canPrev}
          className="border-border/80 bg-card hover:bg-muted/40 h-8 w-8 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.025)] transition-all active:translate-y-px active:shadow-none disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="border-primary/20 bg-primary/10 text-primary flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_1px_2px_rgba(0,0,0,0.3)]">
          {pageIndex + 1}
        </div>

        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          onClick={onNextPage}
          disabled={!canNext}
          className="border-border/80 bg-card hover:bg-muted/40 h-8 w-8 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.025)] transition-all active:translate-y-px active:shadow-none disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Table<T>({
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
}: Readonly<CustomTableProps<T>>) {
  const [sort, setSort] = useState<SortState>({
    key: null,
    direction: null,
  });
  const [pageIndex, setPageIndex] = useState(0);

  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnConfig<T>>();
    columns.forEach((c) => {
      map.set(c.key, c);
    });
    return map;
  }, [columns]);

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
          direction: "asc",
        };
      }
      if (prev.direction === "asc") {
        return {
          key: colKey,
          direction: "desc",
        };
      }
      return {
        key: null,
        direction: null,
      };
    });
    setPageIndex(0);
  };

  const pageCount = Math.max(1, Math.ceil(sortedData.length / pageSize));

  const paginatedData = useMemo(
    () =>
      sortedData.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [sortedData, pageIndex, pageSize],
  );

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

  const renderTableContent = () => {
    if (isLoading) {
      return <CustomTableLoading loadingLabel={loadingLabel} />;
    }

    if (sortedData.length === 0) {
      return (
        <CustomTableEmpty
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      );
    }

    return (
      <table
        className="w-full min-w-180 table-auto border-collapse"
        aria-label={caption ?? undefined}
      >
        {caption && (
          <caption className="text-foreground sr-only text-left text-sm font-bold">
            {caption}
          </caption>
        )}

        <CustomTableHeader
          columns={columns}
          sort={sort}
          alignClass={alignClass}
          justifyClass={justifyClass}
          onSortClick={handleSortClick}
        />

        <CustomTableBody
          paginatedData={paginatedData}
          columns={columns}
          rowKey={rowKey}
          onRowClick={onRowClick}
          alignClass={alignClass}
        />
      </table>
    );
  };

  return (
    <Card className="border-border bg-card text-card-foreground relative gap-0 overflow-hidden rounded-xl border p-0 shadow-[0_1px_0_rgba(255,255,255,0.07),0_2px_3px_rgba(0,0,0,0.65),0_8px_20px_rgba(0,0,0,0.28)]">
      {/* TOP / LEFT HIGHLIGHT */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-t border-l border-white/[0.07]"
      />

      {/* BOTTOM / RIGHT EDGE */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-r border-b border-black/50"
      />

      {/* INNER SURFACE SHADOW */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-px z-20 rounded-[11px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.025),inset_0_-2px_5px_rgba(0,0,0,0.28)]"
      />

      <div className="relative z-10">
        <div className="overflow-x-auto">{renderTableContent()}</div>

        {!isLoading && sortedData.length > 0 && (
          <CustomTablePagination
            pageIndex={pageIndex}
            pageCount={pageCount}
            onPrevPage={() => setPageIndex((p) => Math.max(0, p - 1))}
            onNextPage={() =>
              setPageIndex((p) => Math.min(pageCount - 1, p + 1))
            }
            canPrev={pageIndex > 0}
            canNext={pageIndex < pageCount - 1}
          />
        )}
      </div>
    </Card>
  );
}
