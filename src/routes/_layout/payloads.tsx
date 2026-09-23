import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Grid } from '@astryxdesign/core/Grid'
import { MoreMenu } from '@astryxdesign/core/MoreMenu'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageFrame } from '#/components/PageFrame'
import { getPayloads } from '#/data/queries'
import type { CapturedPayload } from '#/data/types'
import { formatDateTime, formatNumber } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

const PAGE = 12

export const Route = createFileRoute('/_layout/payloads')({
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

function PayloadCard({ payload, onPublish }: { payload: CapturedPayload; onPublish: (payload: CapturedPayload) => void }) {
  const navigate = useNavigate()
  const hash = encodeURIComponent(payload.hash)
  return (
    <Card>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="start" gap={2}>
          <EntityLink kind="payload" id={hash}>
            <Text type="code" maxLines={1}>
              {`${payload.hash.slice(0, 20)}…`}
            </Text>
          </EntityLink>
          <MoreMenu
            size="sm"
            label="Payload actions"
            items={[
              { label: 'Static analysis', onClick: () => void navigate({ href: `/payload-analysis/${hash}` }) },
              { label: 'Analysis workbench', onClick: () => void navigate({ href: `/payload-workbench/results?tab=workbench&hash=${hash}` }) },
              { label: 'Related events', onClick: () => void navigate({ href: `/events?kind=download` }) },
              { label: 'Publish to GitHub…', onClick: () => onPublish(payload) },
            ]}
          />
        </HStack>
        <HStack gap={1} wrap="wrap">
          {payload.sources.map((source) => (
            <Token key={source} size="sm" label={source} href={`/payloads?source=${source}`} />
          ))}
          {payload.verdict && (
            <Token size="sm" color={VERDICT_COLOR[payload.verdict.label]} label={payload.verdict.label} href={`/github-analysis/${hash}`} />
          )}
          {payload.verdict?.family && <Token size="sm" color="purple" label={payload.verdict.family} />}
        </HStack>
        <Text type="supporting">
          {[payload.kind, payload.platform, payload.mime, formatSize(payload.sizeBytes), payload.copies > 1 && `${payload.copies} copies`, payload.dynamic ? 'dynamic route ready' : 'static-only']
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <CodeBlock code={payload.preview} title="First 48 bytes, read only" hasCopyButton={false} />
        <Text type="supporting">Captured {formatDateTime(payload.capturedAt)}</Text>
      </VStack>
    </Card>
  )
}

function PayloadsPage() {
  const { payloads, sources } = Route.useLoaderData()
  const { source } = Route.useSearch()
  const [shown, setShown] = useState(PAGE)
  const [publishing, setPublishing] = useState<CapturedPayload | null>(null)
  const [published, setPublished] = useState<string | null>(null)
  const visible = source ? payloads.filter((p) => p.sources.includes(source)) : payloads

  return (
    <PageFrame
      title="Captured payloads"
      description="Every file attackers dropped or downloaded, with verdicts, a byte preview, and ways into its analysis."
      actions={<Text type="supporting">{formatNumber(visible.length)} payloads</Text>}
    >
      <VStack gap={5}>
        <HStack gap={1.5} wrap="wrap" vAlign="center">
          <Token size="sm" label={`All (${payloads.length})`} color={source ? 'default' : 'blue'} href="/payloads" />
          {sources.map((row) => (
            <Token key={row.id} size="sm" label={`${row.label} (${row.count})`} color={source === row.label ? 'blue' : 'default'} href={`/payloads?source=${row.label}`} />
          ))}
        </HStack>
        {published && (
          <Banner status="success" title="Submitted for publication" description={`${published.slice(0, 16)}… was queued for the public analysis repository (mock).`} isDismissable onDismiss={() => setPublished(null)} />
        )}
        <Grid columns={{ minWidth: 340, repeat: 'fill' }} gap={4}>
          {visible.slice(0, shown).map((payload) => (
            <PayloadCard key={payload.hash} payload={payload} onPublish={setPublishing} />
          ))}
        </Grid>
        {shown < visible.length && (
          <HStack gap={3} hAlign="center" vAlign="center">
            <Text type="supporting">
              {shown} of {visible.length}
            </Text>
            <Button label="View more" variant="secondary" size="sm" onClick={() => setShown((n) => n + PAGE)} />
          </HStack>
        )}
      </VStack>
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
    </PageFrame>
  )
}
