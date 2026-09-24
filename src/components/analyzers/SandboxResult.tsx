import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Grid } from '@astryxdesign/core/Grid'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { MiniTable, Panel, StatTile } from '../DashboardBlocks'
import { TechniquesPanel } from '../DetailBlocks'
import type { SandboxRun } from '#/data/types'
import { AnalyzerSection } from './AnalyzerSection'
import { queuePayloadAction } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'
import { EntityLink } from '../EntityLink'
import { ADMIN_REQUIRED, useIsAdmin } from '#/lib/session'
import { useGuardedAction } from '#/lib/useGuardedAction'

const VERDICT_COLOR = { malicious: 'red', suspicious: 'orange', benign: 'green' } as const

function List({ items }: { items: string[] }) {
  return items.length ? (
    <VStack gap={1}>
      {items.map((item) => (
        <Text key={item} type="code">
          {item}
        </Text>
      ))}
    </VStack>
  ) : (
    <Text type="supporting">Nothing recorded.</Text>
  )
}

export function SandboxResult({ run }: { run: SandboxRun }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isAdmin = useIsAdmin()
  const { error, guard, clearError } = useGuardedAction()
  const [queued, setQueued] = useState<string | null>(null)

  return (
    <AnalyzerSection
      title="Sandbox result"
      description="One detonation's full behavior record: verdict, platform, and every exported artifact."
      actions={
        <HStack gap={2} vAlign="center">
          <Token size="sm" color={VERDICT_COLOR[run.verdict]} label={run.verdict} />
          <Button label="Re-analyze" size="sm" variant="secondary" isDisabled={!isAdmin} tooltip={isAdmin ? undefined : ADMIN_REQUIRED} onClick={() => setConfirmOpen(true)} />
        </HStack>
      }
    >
      <VStack gap={5}>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <EntityLink kind="payload" id={run.hash}>
            <Text type="code">{`${run.hash.slice(0, 24)}…`}</Text>
          </EntityLink>
          <Text type="supporting">detonated {formatDateTime(run.at)}</Text>
        </HStack>
        {queued && <Banner status="success" title={queued} description="Mock: nothing was actually queued." isDismissable onDismiss={() => setQueued(null)} />}
        <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={4}>
          <StatTile label="Dynamic risk" value={run.risk} caption="out of 100" />
          <StatTile label="Duration" value={run.durationSeconds} caption="seconds" />
          <StatTile label="Captured packets" value={run.packets} />
          <StatTile label="Changed paths" value={run.changedPaths.length} />
        </Grid>
        {(
          <VStack gap={4}>
            <Panel title="What this run concluded">
              <MetadataList label={{ position: 'start', width: 120 }}>
                <MetadataListItem label="Verdict">{run.verdict}</MetadataListItem>
                <MetadataListItem label="Platform">{run.platform}</MetadataListItem>
                <MetadataListItem label="Job">
                  <Text type="code">{run.job.slice(0, 24)}</Text>
                </MetadataListItem>
              </MetadataList>
            </Panel>
            <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
              <Panel title="IOCs: static analysis">
                <List items={run.iocsStatic} />
              </Panel>
              <Panel title="IOCs: observed at runtime">
                <List items={run.iocsDynamic} />
              </Panel>
            </Grid>
            <TechniquesPanel techniques={run.techniques} />
          </VStack>
        )}
        {(
          <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
            <MiniTable title="Top system calls" header="Syscall" rows={run.syscalls} isCode />
            <Panel title="Created or changed paths">
              <List items={run.changedPaths} />
            </Panel>
            <Panel title="Processes added">
              <List items={run.processesAdded} />
            </Panel>
            <Panel title="Sockets added">
              <List items={run.socketsAdded} />
            </Panel>
            <Panel title="Process output">
              <CodeBlock code={run.output} hasCopyButton={false} />
            </Panel>
          </Grid>
        )}
        {(
          <VStack gap={4}>
            <Panel title="Connections">
              <Table
                data={run.connections.map((c, i) => ({ ...c, id: String(i) }))}
                columns={[
                  { key: 'proto', header: 'Proto', width: pixel(72) },
                  { key: 'dst', header: 'Destination', width: proportional(2), renderCell: (row) => <Text type="code">{`${row.dst}:${row.port}`}</Text> },
                  { key: 'bytes', header: 'Bytes', width: pixel(96), align: 'end', renderCell: (row) => formatNumber(row.bytes) },
                ]}
                idKey="id"
                density="compact"
              />
            </Panel>
            <Panel title="DNS queries">
              <List items={run.dns} />
            </Panel>
          </VStack>
        )}
        {(
          <Panel title="How the run itself went">
            <MetadataList label={{ position: 'start', width: 136 }}>
              {Object.entries(run.diagnostics).map(([k, v]) => (
                <MetadataListItem key={k} label={k}>
                  {v}
                </MetadataListItem>
              ))}
            </MetadataList>
          </Panel>
        )}
        {<CodeBlock code={JSON.stringify(run, null, 2)} language="json" maxHeight={560} />}
      </VStack>
      {error && <Banner status="error" title="Not queued" description={error} isDismissable onDismiss={clearError} />}
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Detonate this sample again?"
        description="Queues a fresh sandbox run. The current result stays until the new one completes."
        actionLabel="Re-analyze"
        actionVariant="primary"
        onAction={async () => {
          setConfirmOpen(false)
          setQueued((await guard(() => queuePayloadAction(run.hash, 'sandbox'))) ?? null)
        }}
      />
    </AnalyzerSection>
  )
}
