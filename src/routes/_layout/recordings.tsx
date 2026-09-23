import { useEffect, useState } from 'react'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getRecordings, getReplay } from '#/data/queries'
import type { Recording, Replay } from '#/data/types'
import { formatClock, formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/recordings')({
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

function ReplayPane({ recording }: { recording: Recording }) {
  const [replay, setReplay] = useState<Replay | null | 'loading'>('loading')
  useEffect(() => {
    let cancelled = false
    setReplay('loading')
    getReplay(recording.shasum).then(
      (result) => !cancelled && setReplay(result),
      () => !cancelled && setReplay(null),
    )
    return () => {
      cancelled = true
    }
  }, [recording.shasum])

  return (
    <VStack gap={4}>
      <MetadataList label={{ position: 'start', width: 88 }}>
        <MetadataListItem label="Closed">{formatDateTime(recording.when)}</MetadataListItem>
        <MetadataListItem label="Source">
          {recording.srcIp ? (
            <HStack gap={1.5} vAlign="center">
              <Link href={`/investigate/ip/${recording.srcIp}`}>{recording.srcIp}</Link>
              {recording.country && <Token label={recording.country} size="sm" />}
            </HStack>
          ) : (
            'unattributed'
          )}
        </MetadataListItem>
        <MetadataListItem label="Session">
          <Link href={`/sessions/${recording.session}`}>{recording.session}</Link>
        </MetadataListItem>
        <MetadataListItem label="SHA-256">
          <Text type="code">{`${recording.shasum.slice(0, 24)}…`}</Text>
        </MetadataListItem>
      </MetadataList>
      {replay === 'loading' ? (
        <Skeleton height={160} />
      ) : replay === null ? (
        <Text color="secondary">Replay unavailable for this recording.</Text>
      ) : (
        <VStack gap={2}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <Text type="supporting">
              {formatNumber(replay.frames)} frames · {replay.durationSeconds.toFixed(1)}s of terminal time
            </Text>
            <Link href={`/tty-replay/${recording.shasum}`}>Open replay page</Link>
          </HStack>
          <CodeBlock code={replay.transcript} title="Transcript" maxHeight={360} isWrapped />
        </VStack>
      )}
    </VStack>
  )
}

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
      getId={(row) => row.id}
      inspectorTitle="Recording"
      renderInspector={(row) => <ReplayPane recording={row} />}
      emptyState={{
        title: ip ? `No recordings from ${ip}` : 'No recordings yet',
        description: 'Cowrie stores a TTY log for every interactive session.',
      }}
    />
  )
}
