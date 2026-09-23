import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getRevDeckRuns } from '#/data/queries'
import type { RevDeckRun } from '#/data/types'
import { formatDateTime } from '#/lib/format'

// An index leaf, not revdeck.tsx: a parent route with a component would
// swallow revdeck/$sha.
export const Route = createFileRoute('/_layout/revdeck/')({
  loader: () => getRevDeckRuns(),
  component: RevDeckIndexPage,
})

const columns: TableColumn<RevDeckRun>[] = [
  { key: 'at', header: 'Analyzed', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.at)}</Text> },
  { key: 'sha', header: 'SHA-256', width: proportional(2), renderCell: (row) => <Link href={`/revdeck/${row.sha}`}><Text type="code">{`${row.sha.slice(0, 24)}…`}</Text></Link> },
  { key: 'status', header: 'Status', width: pixel(112), renderCell: (row) => <Token size="sm" color={row.status === 'completed' ? 'green' : 'red'} label={row.status} /> },
  { key: 'verdict', header: 'Verdict', width: proportional(1) },
]

function RevDeckIndexPage() {
  const runs = Route.useLoaderData()
  return (
    <RecordList
      title="RevDeck"
      description="Reverse-engineering deck runs: deep binary walkthroughs produced by the Ghidra worker's drain queue."
      rows={runs}
      columns={columns}
      getId={(row) => row.sha}
      inspectorTitle="Run"
      renderInspector={(row) => (
        <VStack gap={3}>
          <MetadataList label={{ position: 'start', width: 80 }}>
            <MetadataListItem label="Status">{row.status}</MetadataListItem>
            <MetadataListItem label="Verdict">{row.verdict}</MetadataListItem>
          </MetadataList>
          {row.summary && <Text>{row.summary}</Text>}
          <Link href={`/revdeck/${row.sha}`} isStandalone>Open the full walkthrough</Link>
        </VStack>
      )}
      emptyState={{ title: 'No RevDeck runs yet', description: 'Runs appear once the Ghidra worker drains its queue.' }}
    />
  )
}
