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

  return toDisplayString(a).localeCompare(
    toDisplayString(b),
    undefined,
    {
      sensitivity: "base"
    }
  );
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
        .filter(
          (c): c is ColumnConfig<T> => Boolean(c)
        ),
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

      return defaultCompare(
        getValue(a),
        getValue(b)
      );
    });

    return sort.direction === "asc"
      ? sorted
      : sorted.reverse();
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

  const pageCount = Math.max(
    1,
    Math.ceil(sortedData.length / pageSize)
  );

  const paginatedData = useMemo(
    () =>
      sortedData.slice(
        pageIndex * pageSize,
        pageIndex * pageSize + pageSize
      ),
    [sortedData, pageIndex, pageSize]
  );

  const handleDragStart =
    (colKey: string) => (e: DragEvent) => {
      setDraggedKey(colKey);
      e.dataTransfer.effectAllowed = "move";
    };

  const handleDragOver =
    (colKey: string) => (e: DragEvent) => {
      e.preventDefault();

      if (colKey !== draggedKey) {
        setDragOverKey(colKey);
      }
    };

  const handleDrop =
    (targetKey: string) => (e: DragEvent) => {
      e.preventDefault();

      if (
        !draggedKey ||
        draggedKey === targetKey
      ) {
        setDraggedKey(null);
        setDragOverKey(null);
        return;
      }

      setColumnOrder((prev) => {
        const next = [...prev];

        const fromIndex =
          next.indexOf(draggedKey);

        const toIndex =
          next.indexOf(targetKey);

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

  const alignClass = (
    align?: "left" | "center" | "right"
  ) => {
    if (align === "center") {
      return "text-center";
    }

    if (align === "right") {
      return "text-right";
    }

    return "text-left";
  };

  const justifyClass = (
    align?: "left" | "center" | "right"
  ) => {
    if (align === "center") {
      return "justify-center";
    }

    if (align === "right") {
      return "justify-end";
    }

    return "justify-start";
  };

  const renderTableBody = () => {
    /*
     * ============================================================
     * LOADING
     * ============================================================
     */

    if (isLoading) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3">
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl

              border
              border-border

              bg-background/50

              shadow-[
                inset_0_1px_2px_rgba(255,255,255,0.04),
                inset_0_-2px_4px_rgba(0,0,0,0.35),
                0_1px_2px_rgba(0,0,0,0.4)
              ]
            "
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>

          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.14em]
              text-muted-foreground
            "
          >
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
          <div
            className="
              mb-4
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl

              border
              border-border

              bg-background/50

              shadow-[
                inset_0_1px_2px_rgba(255,255,255,0.04),
                inset_0_-2px_4px_rgba(0,0,0,0.35),
                0_1px_2px_rgba(0,0,0,0.4)
              ]
            "
          >
            {emptyIcon ?? (
              <Inbox className="h-5 w-5 text-muted-foreground/60" />
            )}
          </div>

          <p className="text-sm font-semibold text-foreground">
            {emptyTitle}
          </p>

          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
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
        className="
          w-full
          min-w-[720px]
          border-collapse
          table-auto
        "
        aria-label={caption ?? undefined}
      >
        {caption && (
          <caption className="sr-only text-left text-sm font-bold text-foreground">
            {caption}
          </caption>
        )}

        {/* ========================================================
            TABLE HEADER
            ======================================================== */}

        <thead
          className="
            relative

            bg-background/40

            shadow-[
              inset_0_2px_5px_rgba(0,0,0,0.28),
              inset_0_-1px_0_rgba(255,255,255,0.025)
            ]
          "
        >
          <tr className="border-b border-border/80">
            {orderedColumns.map((col) => {
              const isSorted =
                sort.key === col.key;

              const isDragOver =
                dragOverKey === col.key;

              const isDragging =
                draggedKey === col.key;

              const renderSortIcon = () => {
                if (!isSorted) {
                  return (
                    <ArrowUpDown
                      className="
                        size-3.5
                        text-muted-foreground/50
                        transition-colors
                        group-hover/sort:text-muted-foreground
                      "
                    />
                  );
                }

                if (sort.direction === "asc") {
                  return (
                    <ArrowUp
                      className="
                        size-3.5
                        text-primary
                      "
                    />
                  );
                }

                return (
                  <ArrowDown
                    className="
                      size-3.5
                      text-primary
                    "
                  />
                );
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
                  className={`
                    relative
                    select-none
                    whitespace-nowrap
                    px-4
                    py-3.5

                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.08em]

                    text-muted-foreground/80

                    transition-colors

                    ${alignClass(col.align)}

                    ${isDragOver ? "bg-primary/[0.07]" : ""}

                    ${isDragging ? "opacity-30" : ""}
                  `}
                >
                  {/* Drag-over indicator */}
                  {isDragOver && (
                    <span
                      className="
                        absolute
                        inset-y-1
                        left-0
                        w-px
                        bg-primary/70
                        shadow-[0_0_8px_rgba(212,169,79,0.4)]
                      "
                    />
                  )}

                  <div
                    className={`
                      flex
                      items-center
                      gap-1.5

                      font-heading

                      ${justifyClass(col.align)}
                    `}
                  >
                    <GripVertical
                      className="
                        size-3.5
                        shrink-0
                        cursor-grab

                        text-muted-foreground/30

                        transition-colors

                        hover:text-muted-foreground/70

                        active:cursor-grabbing
                      "
                    />

                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleSortClick(col.key)
                        }
                        className="
                          group/sort
                          flex
                          items-center
                          gap-1.5

                          transition-colors

                          hover:text-foreground
                        "
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
                      if (
                        e.key === "Enter" ||
                        e.key === " "
                      ) {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={
                onRowClick ? 0 : undefined
              }
              role={
                onRowClick ? "button" : undefined
              }
              aria-label={
                onRowClick
                  ? `View row ${rowKey(row)}`
                  : undefined
              }
              className={`
                group

                border-b
                border-border/60

                bg-transparent

                transition-colors
                duration-150

                shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]

                ${
                  onRowClick
                    ? `
                      cursor-pointer

                      hover:bg-muted/20

                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      focus-visible:ring-inset
                    `
                    : ""
                }
              `}
            >
              {orderedColumns.map((col) => (
                <td
                  key={col.key}
                  className={`
                    px-4
                    py-4

                    align-middle
                    text-sm

                    ${alignClass(col.align)}
                  `}
                >
                  {col.render
                    ? col.render(row)
                    : toDisplayString(
                        (
                          row as Record<
                            string,
                            unknown
                          >
                        )[col.key]
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
    <Card
      className="
        relative

        overflow-hidden

        rounded-xl

        border
        border-border

        bg-card
        text-card-foreground

        p-0
        gap-0

        shadow-[
          0_1px_0_rgba(255,255,255,0.07),
          0_2px_3px_rgba(0,0,0,0.65),
          0_8px_20px_rgba(0,0,0,0.28)
        ]
      "
    >
      {/* ============================================================
          TOP / LEFT HIGHLIGHT
          ============================================================ */}

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          inset-0
          z-20

          rounded-[inherit]

          border-t
          border-l
          border-white/[0.07]
        "
      />

      {/* ============================================================
          BOTTOM / RIGHT EDGE
          ============================================================ */}

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          inset-0
          z-20

          rounded-[inherit]

          border-b
          border-r
          border-black/50
        "
      />

      {/* ============================================================
          INNER SURFACE SHADOW
          ============================================================ */}

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          inset-px
          z-20

          rounded-[11px]

          shadow-[
            inset_0_1px_2px_rgba(255,255,255,0.025),
            inset_0_-2px_5px_rgba(0,0,0,0.28)
          ]
        "
      />

      <div className="relative z-10">
        <div className="overflow-x-auto">
          {renderTableBody()}
        </div>

        {/* ========================================================
            PAGINATION
            ======================================================== */}

        {!isLoading &&
          sortedData.length > 0 && (
            <div
              className="
                flex
                items-center
                justify-between

                border-t
                border-border/80

                bg-background/30

                px-4
                py-3.5

                shadow-[
                  inset_0_2px_4px_rgba(0,0,0,0.25),
                  inset_0_1px_0_rgba(255,255,255,0.02)
                ]
              "
            >
              <span
                className="
                  text-xs
                  font-medium
                  text-muted-foreground
                "
              >
                Showing page{" "}
                <span className="font-semibold text-foreground">
                  {pageIndex + 1}
                </span>{" "}
                of {pageCount}
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous page"
                  onClick={() =>
                    setPageIndex((p) =>
                      Math.max(0, p - 1)
                    )
                  }
                  disabled={pageIndex === 0}
                  className="
                    h-8
                    w-8
                    rounded-md

                    border-border/80

                    bg-card

                    shadow-[
                      0_1px_2px_rgba(0,0,0,0.3),
                      inset_0_1px_0_rgba(255,255,255,0.025)
                    ]

                    transition-all

                    hover:bg-muted/40

                    active:translate-y-px
                    active:shadow-none

                    disabled:opacity-35
                  "
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div
                  className="
                    flex
                    h-8
                    min-w-8
                    items-center
                    justify-center

                    rounded-md

                    border
                    border-primary/20

                    bg-primary/[0.08]

                    px-2

                    text-xs
                    font-semibold
                    text-primary

                    shadow-[
                      inset_0_1px_0_rgba(255,255,255,0.025),
                      0_1px_2px_rgba(0,0,0,0.3)
                    ]
                  "
                >
                  {pageIndex + 1}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next page"
                  onClick={() =>
                    setPageIndex((p) =>
                      Math.min(
                        pageCount - 1,
                        p + 1
                      )
                    )
                  }
                  disabled={
                    pageIndex >= pageCount - 1
                  }
                  className="
                    h-8
                    w-8
                    rounded-md

                    border-border/80

                    bg-card

                    shadow-[
                      0_1px_2px_rgba(0,0,0,0.3),
                      inset_0_1px_0_rgba(255,255,255,0.025)
                    ]

                    transition-all

                    hover:bg-muted/40

                    active:translate-y-px
                    active:shadow-none

                    disabled:opacity-35
                  "
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