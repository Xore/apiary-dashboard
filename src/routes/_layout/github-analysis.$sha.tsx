import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Grid } from '@astryxdesign/core/Grid'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Panel, StatTile } from '#/components/DashboardBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getGithubAnalysis, queuePayloadAction } from '#/data/queries'
import type { GithubStatus } from '#/data/types'
import { formatDateTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

export const Route = createFileRoute('/_layout/github-analysis/$sha')({
  loader: async ({ params }) => {
    const analysis = await getGithubAnalysis(params.sha)
    if (!analysis) throw notFound()
    return analysis
  },
  notFoundComponent: () => <NotFound title="GitHub analysis" description="No GitHub-analysis result found for this hash." />,
  component: GithubPage,
})

const STATUS_BANNER: Record<Exclude<GithubStatus, 'published'>, { title: string; description: string }> = {
  dry_run: { title: 'Dry run', description: 'The pipeline ran without publishing; no scanner results were collected.' },
  denylist_blocked: { title: 'Blocked by the denylist', description: 'This sample matched the publication denylist and was not published.' },
  quota_exceeded: { title: 'Scanner quota exceeded', description: 'Publication stopped because the daily scanner quota ran out. Resubmit later.' },
}

const VERDICT_COLOR = { malicious: 'red', suspicious: 'orange', undetected: 'gray' } as const

function GithubPage() {
  const g = Route.useLoaderData()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [queued, setQueued] = useState<string | null>(null)
  return (
    <PageFrame
      title="GitHub analysis"
      description="A published sample's multi-engine scanner verdict from the public analysis repository."
      actions={<Button label="Resubmit" size="sm" variant="secondary" onClick={() => setConfirmOpen(true)} />}
    >
      <VStack gap={5}>
        <HStack gap={3} wrap="wrap">
          <EntityLink kind="payload" id={g.sha}><Text type="code">{`${g.sha.slice(0, 24)}…`}</Text></EntityLink>
          <Text type="supporting">{formatDateTime(g.at)}</Text>
        </HStack>
        {g.status !== 'published' && <Banner status="warning" {...STATUS_BANNER[g.status]} />}
        {queued && <Banner status="success" title={queued} description="Mock: nothing was actually submitted." isDismissable onDismiss={() => setQueued(null)} />}
        <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
          <StatTile label="Detections" value={g.detections} caption={`of ${g.engines} engines`} />
          <Panel title="Risk level">
            <Token size="sm" color={g.risk === 'high' ? 'red' : g.risk === 'medium' ? 'orange' : 'green'} label={g.risk} />
          </Panel>
          <Panel title="Family">
            <Text>{g.family ?? '—'}</Text>
          </Panel>
          <StatTile label="Auto YARA rules" value={g.yaraRules.length} />
        </Grid>
        <Panel title="Scanner results">
          <Table
            data={g.results.map((r) => ({ ...r, id: r.engine }))}
            columns={[
              { key: 'engine', header: 'Engine', width: pixel(160) },
              { key: 'verdict', header: 'Verdict', width: pixel(120), renderCell: (row) => <Token size="sm" color={VERDICT_COLOR[row.verdict]} label={row.verdict} /> },
              { key: 'label', header: 'Label', width: proportional(2), renderCell: (row) => (row.label ? <Text type="code">{row.label}</Text> : '—') },
            ]}
            idKey="id"
            density="compact"
          />
        </Panel>
        <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
          <Panel title="Publication record">
            <MetadataList label={{ position: 'start', width: 96 }}>
              <MetadataListItem label="Status">{g.status}</MetadataListItem>
              <MetadataListItem label="Repository">
                <Text type="code">{g.repoPath}</Text>
              </MetadataListItem>
            </MetadataList>
          </Panel>
          <Panel title="Auto-generated YARA rules">
            {g.yaraRules.length ? g.yaraRules.map((r) => <Text key={r} type="code">{r}</Text>) : <Text type="supporting">None generated.</Text>}
          </Panel>
        </Grid>
      </VStack>
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Resubmit for publication?"
        description="Publishes the sample again and requests a fresh scan from third-party engines. The sample becomes public."
        actionLabel="Resubmit"
        onAction={async () => {
          setConfirmOpen(false)
          setQueued(await queuePayloadAction(g.sha, 'github'))
        }}
      />
    </PageFrame>
  )
}
