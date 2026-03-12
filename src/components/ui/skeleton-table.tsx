import { Skeleton } from '@/components/ui/skeleton'
import { TableRow, TableCell } from '@/components/ui/table'

/**
 * Column definition for skeleton table rows.
 *
 * - `string`   → single skeleton line, e.g. `"h-4 w-40"`
 * - `string[]` → stacked lines (vertical), e.g. `["h-4 w-28", "h-3 w-20"]`
 * - `object`   → full control over layout, alignment, and cell className
 */
type SkeletonColumnDef =
  | string
  | string[]
  | {
      lines: string[]
      row?: boolean
      align?: 'right' | 'center'
      cellClassName?: string
    }

interface SkeletonTableRowsProps {
  columns: SkeletonColumnDef[]
  rows?: number
}

export function SkeletonTableRows({ columns, rows = 5 }: SkeletonTableRowsProps) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          {columns.map((col, j) => {
            if (typeof col === 'string') {
              return (
                <TableCell key={j}>
                  <Skeleton className={col} />
                </TableCell>
              )
            }

            if (Array.isArray(col)) {
              return (
                <TableCell key={j}>
                  <div className="flex flex-col gap-1">
                    {col.map((line, k) => (
                      <Skeleton key={k} className={line} />
                    ))}
                  </div>
                </TableCell>
              )
            }

            const { lines, row: horizontal, align, cellClassName } = col
            const classes = [
              'flex',
              horizontal ? 'items-center gap-1.5' : 'flex-col gap-1',
              align === 'right' ? (horizontal ? 'justify-end' : 'items-end') : '',
              align === 'center' ? (horizontal ? 'justify-center' : 'items-center') : '',
            ].filter(Boolean).join(' ')

            return (
              <TableCell key={j} className={cellClassName}>
                <div className={classes}>
                  {lines.map((line, k) => (
                    <Skeleton key={k} className={line} />
                  ))}
                </div>
              </TableCell>
            )
          })}
        </TableRow>
      ))}
    </>
  )
}

export type { SkeletonColumnDef }
