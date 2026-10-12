import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type Column<Row> = {
  key: string
  header: React.ReactNode
  cell: (row: Row) => React.ReactNode
  align?: "left" | "right" | "center"
  /** Tailwind width class, e.g. "w-40". */
  width?: string
  className?: string
}

/**
 * Presentational table: semantic markup, labeled horizontal scroll region,
 * tabular numbers. Sorting, filtering and paging stay with the caller's data
 * layer — this component never fakes them.
 */
function DataTable<Row>({
  caption,
  hideCaption = true,
  columns,
  rows,
  getRowId,
  density = "comfortable",
  loading = false,
  loadingRows = 5,
  empty,
  className,
}: {
  caption: string
  hideCaption?: boolean
  columns: Column<Row>[]
  rows: Row[]
  getRowId: (row: Row) => string
  density?: "comfortable" | "compact"
  loading?: boolean
  loadingRows?: number
  empty?: React.ReactNode
  className?: string
}) {
  const cellPad = density === "compact" ? "px-3 py-2" : "px-4 py-3"
  const alignClass = (align?: Column<Row>["align"]) =>
    align === "right" ? "text-right tabular-nums" : align === "center" ? "text-center" : "text-left"

  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cn("relative overflow-x-auto rounded-card border border-border bg-surface", className)}
    >
      <table className={cn("w-full border-collapse", density === "compact" ? "text-caption sm:text-label" : "text-label")}>
        <caption className={cn("px-4 py-3 text-left text-label font-semibold", hideCaption && "sr-only")}>
          {caption}
        </caption>
        <thead className="bg-surface-muted/70">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  cellPad,
                  "text-caption font-medium whitespace-nowrap text-muted-foreground",
                  alignClass(col.align),
                  col.width
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: loadingRows }, (_, i) => (
                <tr key={`loading-${i}`} className="border-t border-border">
                  {columns.map((col) => (
                    <td key={col.key} className={cellPad}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.length === 0
              ? (
                  <tr className="border-t border-border">
                    <td colSpan={columns.length}>{empty}</td>
                  </tr>
                )
              : rows.map((row) => (
                  <tr
                    key={getRowId(row)}
                    className="border-t border-border transition-colors duration-(--motion-fast) hover:bg-surface-muted/40"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn(cellPad, "align-middle", alignClass(col.align), col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  )
}

export { DataTable }
export type { Column }
