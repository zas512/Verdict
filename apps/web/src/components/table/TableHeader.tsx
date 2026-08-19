import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHeaderProps } from "@/types/tableTypes";

export function TableHeader<T>({
  columns,
  sort,
  alignClass,
  justifyClass,
  onSortClick
}: Readonly<TableHeaderProps<T>>) {
  return (
    <thead>
      <tr className="border-foreground/30 border-b">
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
