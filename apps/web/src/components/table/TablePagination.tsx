import type { TablePaginationProps } from "@/types/tableTypes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

export function TablePagination({
  pageIndex,
  pageCount,
  onPrevPage,
  onNextPage,
  canPrev,
  canNext
}: Readonly<TablePaginationProps>) {
  return (
    <div className="border-foreground/30 flex h-14 items-center justify-between border-t px-4">
      <span className="text-foreground/80 text-sm font-bold tracking-wide">
        Showing page{" "}
        <span className="text-foreground font-bold">{pageIndex + 1}</span> of{" "}
        <span className="text-foreground font-bold">{pageCount}</span>
      </span>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          onClick={onPrevPage}
          disabled={!canPrev}
          className="border-border/80 bg-card hover:bg-muted/40 h-8 w-8 rounded-md active:translate-y-px active:shadow-none disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="border-primary/20 bg-primary/10 text-primary flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold">
          {pageIndex + 1}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          onClick={onNextPage}
          disabled={!canNext}
          className="border-border/80 bg-card hover:bg-muted/40 h-8 w-8 rounded-md active:translate-y-px active:shadow-none disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
