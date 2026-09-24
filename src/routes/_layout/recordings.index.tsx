import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { entityHref } from '#/lib/entities'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getRecordings } from '#/data/queries'
import type { Recording } from '#/data/types'
import { formatClock, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/recordings/')({
  validateSearch: (search: Record<string, unknown>): { ip?: string } => ({
    ip: typeof search.ip === 'string' && search.ip ? search.ip : undefined,
  }),
  loaderDeps: ({ search }) => ({ ip: search.ip }),
  loader: ({ deps }) => getRecordings(deps.ip),
  component: RecordingsPage,
})

const columns: TableColumn<Recording>[] = [
  { key: 'when', header: 'Closed (UTC)', width: pixel(120), renderCell: (row) => <Text type="supporting">{formatClock(row.when)}</Text> },
  { key: 'srcIp', header: 'Source', width: pixel(136), renderCell: (row) => row.srcIp ?? '—' },
  { key: 'country', header: 'Country', width: pixel(80), renderCell: (row) => row.country ?? '—' },
  { key: 'session', header: 'Session', width: proportional(2), renderCell: (row) => <Text type="code">{row.session}</Text> },
  { key: 'sizeBytes', header: 'Size', width: pixel(88), align: 'end', renderCell: (row) => `${(row.sizeBytes / 1024).toFixed(1)} KB` },
  { key: 'durationMs', header: 'Duration', width: pixel(104), align: 'end', renderCell: (row) => `${(row.durationMs / 1000).toFixed(1)} s` },
]


function RecordingsPage() {
  const recordings = Route.useLoaderData()
  const { ip } = Route.useSearch()
  return (
    <RecordList
      title="Session recordings"
      description="Terminal recordings of interactive honeypot sessions. Many sessions share one recording because bot traffic repeats itself."
      actions={
        <>
          <Text type="supporting">{formatNumber(recordings.length)} recordings</Text>
          {ip && <Token label={`ip: ${ip}`} size="sm" color="blue" href="/recordings" description="Clear the IP filter" />}
        </>
      }
      rows={recordings}
      columns={columns}
      getHref={(row) => entityHref('recording', row.shasum)!}
      getId={(row) => row.id}
      emptyState={{
        title: ip ? `No recordings from ${ip}` : 'No recordings yet',
        description: 'Cowrie stores a TTY log for every interactive session.',
      }}
    />
  )
}
