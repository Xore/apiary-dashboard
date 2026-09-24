import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { MoreMenu } from '@astryxdesign/core/MoreMenu'
import { HStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getPayloads } from '#/data/queries'
import type { CapturedPayload } from '#/data/types'
import { entityHref } from '#/lib/entities'
import { formatTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/payloads/')({
  validateSearch: (search: Record<string, unknown>): { source?: string } => ({
    source: typeof search.source === 'string' && search.source ? search.source : undefined,
  }),
  loader: () => getPayloads(),
  component: PayloadsPage,
})

const VERDICT_COLOR = { malicious: 'red', suspicious: 'orange', clean: 'green' } as const

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

/** The actions a card used to carry; clicking the row opens the payload. */
function PayloadActions({ payload, onPublish }: { payload: CapturedPayload; onPublish: (payload: CapturedPayload) => void }) {
  const navigate = useNavigate()
  const hash = encodeURIComponent(payload.hash)
  return (
    <MoreMenu
      size="sm"
      label="Payload actions"
      items={[
        { label: 'Static analysis', onClick: () => void navigate({ href: `/payloads/${hash}/static` }) },
        { label: 'Analysis workbench', onClick: () => void navigate({ href: `/payload-workbench/results?tab=workbench&hash=${hash}` }) },
        { label: 'Who delivered it', onClick: () => void navigate({ href: `/payloads/${hash}/delivered-by` }) },
        { label: 'Publish to GitHub…', onClick: () => onPublish(payload) },
      ]}
    />
  )
}

const columns = (onPublish: (payload: CapturedPayload) => void): TableColumn<CapturedPayload>[] => [
  { key: 'hash', header: 'SHA-256', width: proportional(2), renderCell: (row) => <Text type="code" maxLines={1}>{`${row.hash.slice(0, 24)}…`}</Text> },
  {
    key: 'verdict',
    header: 'Verdict',
    width: pixel(176),
    renderCell: (row) =>
      row.verdict ? (
        <HStack gap={1}>
          <Token size="sm" color={VERDICT_COLOR[row.verdict.label]} label={row.verdict.label} />
          {row.verdict.family && <Token size="sm" color="purple" label={row.verdict.family} />}
        </HStack>
      ) : (
        <Text type="supporting">not analyzed</Text>
      ),
  },
  { key: 'kind', header: 'Kind', width: pixel(104) },
  { key: 'platform', header: 'Platform', width: pixel(120) },
  { key: 'sizeBytes', header: 'Size', width: pixel(88), align: 'end', renderCell: (row) => formatSize(row.sizeBytes) },
  { key: 'sources', header: 'Captured by', width: pixel(144), renderCell: (row) => row.sources.join(' ') },
  { key: 'copies', header: 'Copies', width: pixel(72), align: 'end' },
  { key: 'capturedAt', header: 'Captured', width: pixel(104), renderCell: (row) => <Text type="supporting">{formatTime(row.capturedAt)}</Text> },
  { key: 'preview', header: '', width: pixel(56), renderCell: (row) => <PayloadActions payload={row} onPublish={onPublish} /> },
]

/** Every captured file as one row; its bytes, verdicts and analyses live on
 * the payload's own page. */
function PayloadsPage() {
  const { payloads, sources } = Route.useLoaderData()
  const { source } = Route.useSearch()
  const [publishing, setPublishing] = useState<CapturedPayload | null>(null)
  const [published, setPublished] = useState<string | null>(null)
  const visible = source ? payloads.filter((p) => p.sources.includes(source)) : payloads

  return (
    <>
      <RecordList
        title="Captured payloads"
        description="Every file attackers dropped or downloaded, with its verdict and where it was captured. Open one for its bytes and every analysis."
        summary={
          published && (
            <Banner status="success" title="Submitted for publication" description={`${published.slice(0, 16)}… was queued for the public analysis repository (mock).`} isDismissable onDismiss={() => setPublished(null)} />
          )
        }
        toolbar={
          <HStack gap={1.5} wrap="wrap" vAlign="center">
            <Token size="sm" label={`All (${payloads.length})`} color={source ? 'default' : 'blue'} href="/payloads" />
            {sources.map((row) => (
              <Token key={row.id} size="sm" label={`${row.label} (${row.count})`} color={source === row.label ? 'blue' : 'default'} href={`/payloads?source=${row.label}`} />
            ))}
          </HStack>
        }
        rows={visible}
        columns={columns(setPublishing)}
        getId={(row) => row.hash}
        getHref={(row) => entityHref('payload', row.hash)!}
        emptyState={{ title: 'No payloads from this sensor', description: 'Pick another source, or All.' }}
      />
      <AlertDialog
        isOpen={publishing !== null}
        onOpenChange={(open) => !open && setPublishing(null)}
        title="Publish to Xore/honeypot?"
        description="The sample's analysis becomes public in the GitHub repository. This cannot be undone from the dashboard."
        actionLabel="Publish"
        onAction={() => {
          setPublished(publishing?.hash ?? null)
          setPublishing(null)
        }}
      />
    </>
  )
}
