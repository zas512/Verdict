import { TableHeaderProps } from "@/types/tableTypes";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export function TableHeader<T>({
  columns,
  sort,
  alignClass,
  justifyClass,
  onSortClick
}: Readonly<TableHeaderProps<T>>) {
  return (
    <thead>
      <tr className="border-foreground/10 bg-muted/40 dark:bg-overlay border-b-2">
        {columns.map((col) => {
          const isSorted = sort.key === col.key;

          const renderSortIcon = () => {
            if (!isSorted) {
              return (
                <ArrowUpDown className="text-muted-foreground/60 group-hover/sort:text-foreground size-4 cursor-pointer" />
              );
            }
            if (sort.direction === "asc") {
              return <ArrowUp className="text-primary size-4 cursor-pointer" />;
            }
            return <ArrowDown className="text-primary size-4 cursor-pointer" />;
          };

          return (
            <th
              key={col.key}
              scope="col"
              className={`text-foreground/90 h-14 px-4 align-middle text-sm font-bold tracking-wide whitespace-nowrap uppercase select-none ${alignClass(col.align)}`}
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
