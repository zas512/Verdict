import { toDisplayString } from "@/components/table";
import type { TableBodyProps } from "@/types/tableTypes";

export function TableBody<T>({
  paginatedData,
  columns,
  rowKey,
  onRowClick,
  alignClass
}: Readonly<TableBodyProps<T>>) {
  return (
    <tbody>
      {paginatedData.map((row, index) => {
        const isLast = index === paginatedData.length - 1;
        return (
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
            className={`group bg-transparent transition-colors duration-150 ${
              onRowClick
                ? `hover:bg-primary/[0.04] dark:hover:bg-primary/[0.08] focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset`
                : ""
            } `}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`text-foreground/90 px-4 py-4 align-middle text-sm ${
                  isLast ? "" : "border-foreground/5 border-b"
                } ${alignClass(col.align)} `}
              >
                {col.render
                  ? col.render(row)
                  : toDisplayString((row as Record<string, unknown>)[col.key])}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}
