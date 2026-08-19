"use client";
import type {
  ColumnConfig,
  SortState,
  TableEmptyProps,
  TableProps
} from "@/types/tableTypes";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { TableBody } from "./TableBody";
import { TableHeader } from "./TableHeader";
import { TableLoading } from "./TableLoading";
import { TablePagination } from "./TablePagination";

export function toDisplayString(value: unknown): string {
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

function TableEmpty({
  emptyIcon,
  emptyTitle,
  emptyDescription
}: Readonly<TableEmptyProps>) {
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
  pageSize = 8
}: Readonly<TableProps<T>>) {
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
      return <TableLoading loadingLabel={loadingLabel} />;
    }
    if (sortedData.length === 0) {
      return (
        <TableEmpty
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      );
    }
    return (
      <table className="w-full" aria-label={caption ?? undefined}>
        <TableHeader
          columns={columns}
          sort={sort}
          alignClass={alignClass}
          justifyClass={justifyClass}
          onSortClick={handleSortClick}
        />
        <TableBody
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
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-border/80 dark:border-[#2A2E36] bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none">
      {/* Top / left highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-t border-l border-transparent dark:border-white/9"
      />

      {/* Bottom / right dark edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-r border-b border-black/[0.04] dark:border-black/70"
      />

      {/* Inner embossed edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-px z-10 rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.035),inset_0_-2px_4px_rgba(0,0,0,0.5)]"
      />

      <div className="overflow-x-auto">{renderTableContent()}</div>
      {!isLoading && sortedData.length > 0 && (
        <TablePagination
          pageIndex={pageIndex}
          pageCount={pageCount}
          onPrevPage={() => setPageIndex((p) => Math.max(0, p - 1))}
          onNextPage={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
          canPrev={pageIndex > 0}
          canNext={pageIndex < pageCount - 1}
        />
      )}
    </div>
  );
}
