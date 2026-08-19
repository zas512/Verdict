import type { ReactNode } from "react";
type AlignType = "left" | "center" | "right";

export interface ColumnConfig<T> {
  key: string;
  header: string;
  width?: string;
  align?: AlignType;
  sortable?: boolean;
  accessor?: (row: T) => string | number | Date | null | undefined;
  render?: (row: T) => ReactNode;
  sortFn?: (a: T, b: T) => number;
}

type SortDirection = "asc" | "desc" | null;

export interface SortState {
  key: string | null;
  direction: SortDirection;
}

export interface TableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  caption?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  onColumnOrderChange?: (orderedKeys: string[]) => void;
}

type alignClass = "left" | "center" | "right";

export interface TableHeaderProps<T> {
  columns: ColumnConfig<T>[];
  sort: SortState;
  alignClass: (align?: alignClass) => string;
  justifyClass: (align?: alignClass) => string;
  onSortClick: (colKey: string) => void;
}

export interface TableBodyProps<T> {
  paginatedData: T[];
  columns: ColumnConfig<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  alignClass: (align?: alignClass) => string;
}

export interface TablePaginationProps {
  pageIndex: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export interface TableEmptyProps {
  emptyIcon?: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}
