import type { TableBodyProps } from "@/types/tableTypes";
import { toDisplayString } from "@/components/table";

export function TableBody<T>({
  paginatedData,
  columns,
  rowKey,
  onRowClick,
  alignClass
}: Readonly<TableBodyProps<T>>) {
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
