import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/Stack'
import { Table } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import type { tableDensity } from '#/lib/prefs'

/** A table still loading: its real columns and `rows` skeleton rows, and
 * with `withCount` the "N records" line above it. */
export function SkeletonTable<T extends Record<string, unknown>>({ columns, rows, density, withCount = false }: { columns: TableColumn<T>[]; rows: number; density?: ReturnType<typeof tableDensity>; withCount?: boolean }) {
  const data = Array.from({ length: rows }, (_, i) => ({ id: `skeleton-${i}` }))
  const skeletonColumns: TableColumn<{ id: string }>[] = columns.map((c) => ({ key: c.key, header: c.header, width: c.width, align: c.align, renderCell: () => <Skeleton height={14} width="70%" /> }))
  const table = <Table data={data} columns={skeletonColumns} idKey="id" density={density} aria-busy />
  return withCount ? (
    <VStack gap={3}>
      <Skeleton width={120} height={14} />
      {table}
    </VStack>
  ) : (
    table
  )
}
