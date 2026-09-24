import { useSyncExternalStore } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { formatDateTime } from '#/lib/format'
import { getPins, getServerPins, subscribe, unpin } from '#/lib/watchlist'
import type { Pin } from '#/lib/watchlist'

export const Route = createFileRoute('/_layout/watchlist')({ component: WatchlistPage })

type Row = Pin & Record<string, unknown>

const columns: TableColumn<Row>[] = [
  { key: 'title', header: 'Entity', width: proportional(3), renderCell: (row) => <Link href={row.href}>{row.title}</Link> },
  { key: 'kind', header: 'Kind', width: pixel(200), renderCell: (row) => <Token size="sm" label={row.kind} /> },
  { key: 'pinnedAt', header: 'Pinned', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.pinnedAt)}</Text> },
  { key: 'href', header: '', width: pixel(96), renderCell: (row) => <Button label="Unpin" size="sm" variant="ghost" onClick={() => unpin(row.href)} /> },
]

/** Entities pinned from their pages, newest first. Kept in this browser. */
function WatchlistPage() {
  const pins = useSyncExternalStore(subscribe, getPins, getServerPins) as Row[]
  return (
    <RecordList
      title="Watchlist"
      description="Entities you pinned with the bookmark button on their page. Pins are kept in this browser."
      rows={pins}
      columns={columns}
      getId={(row) => row.href}
      getHref={(row) => row.href}
      emptyState={{ title: 'Nothing pinned yet', description: 'Open any source, session, payload, campaign or indicator and use the bookmark button in its header.' }}
    />
  )
}
