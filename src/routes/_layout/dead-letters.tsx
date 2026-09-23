import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getDeadLetters, purgeDeadLetters } from '#/data/queries'
import type { DeadLetter } from '#/data/types'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/dead-letters')({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
  }),
  loaderDeps: ({ search }) => ({ q: search.q ?? '' }),
  loader: ({ deps }) => getDeadLetters(deps.q),
  component: DeadLettersPage,
})

const columns: TableColumn<DeadLetter>[] = [
  { key: 'timestamp', header: 'Time', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.timestamp)}</Text> },
  { key: 'source', header: 'Source', width: pixel(104), renderCell: (row) => <Token size="sm" label={row.source} /> },
  { key: 'reason', header: 'Reason', width: proportional(4), renderCell: (row) => <Text type="code" maxLines={1}>{row.reason}</Text> },
]

function DeadLettersPage() {
  const rows = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [draft, setDraft] = useState(q ?? '')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <>
      <RecordList
        title="Ingest dead letters"
        description="Documents Elasticsearch rejected, with their original error and field shape for remediation. An empty list is the healthy state."
        actions={<Button label={`Purge ${rows.length} shown`} size="sm" variant="destructive" isDisabled={rows.length === 0} onClick={() => setConfirmOpen(true)} />}
        toolbar={
          <HStack gap={2} vAlign="end">
            <StackItem size="fill">
              <TextInput label="Query" isLabelHidden placeholder="Optional query, e.g. mapper_parsing_exception" value={draft} onChange={setDraft} onEnter={() => void navigate({ search: { q: draft.trim() || undefined } })} />
            </StackItem>
            <Button label="Filter" variant="secondary" onClick={() => void navigate({ search: { q: draft.trim() || undefined } })} />
          </HStack>
        }
        rows={rows}
        columns={columns}
        getId={(row) => row.id}
        inspectorTitle="Rejected document"
        renderInspector={(row) => (
          <VStack gap={4}>
            <Text type="code">{row.reason}</Text>
            <MetadataList label={{ position: 'start', width: 80 }}>
              <MetadataListItem label="Time">{formatDateTime(row.timestamp)}</MetadataListItem>
              <MetadataListItem label="Index">
                <Text type="code">{row.index}</Text>
              </MetadataListItem>
            </MetadataList>
            <CodeBlock code={JSON.stringify(row.document, null, 2)} language="json" title="Original document" />
          </VStack>
        )}
        emptyState={{ title: 'No dead letters', description: 'Every document was accepted. This is the healthy state.' }}
      />
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Purge ${rows.length} dead letters?`}
        description={q ? `Deletes only the documents matching “${q}”. This cannot be undone.` : 'No query is set, so this deletes every dead letter. This cannot be undone.'}
        actionLabel="Purge"
        isActionLoading={busy}
        onAction={async () => {
          setBusy(true)
          try {
            await purgeDeadLetters(rows.map((r) => r.id))
            await router.invalidate()
          } finally {
            setBusy(false)
            setConfirmOpen(false)
          }
        }}
      />
    </>
  )
}
