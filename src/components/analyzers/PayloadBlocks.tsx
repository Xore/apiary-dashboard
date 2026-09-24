import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { queuePayloadAction } from '#/data/queries'
import type { PayloadAction } from '#/data/queries'
import type { Ioc, PayloadAnalysis } from '#/data/types'
import { Panel } from '../DashboardBlocks'
import { EntityLink } from '../EntityLink'

export const VERDICT_COLOR = { malicious: 'red', suspicious: 'orange', clean: 'green' } as const

export const iocColumns: TableColumn<Ioc>[] = [
  { key: 'kind', header: 'Kind', width: pixel(88), renderCell: (row) => <Token size="sm" label={row.kind} /> },
  {
    key: 'value',
    header: 'Indicator',
    width: proportional(1),
    renderCell: (row) =>
      row.kind === 'ip' ? <EntityLink kind="source" id={row.value} /> : <Text type="code">{row.value}</Text>,
  },
]

export function OperatorActions({ a }: { a: PayloadAnalysis }) {
  const [busy, setBusy] = useState<PayloadAction | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const run = async (action: PayloadAction) => {
    setBusy(action)
    try {
      setDone(await queuePayloadAction(a.payload.hash, action))
    } finally {
      setBusy(null)
    }
  }
  return (
    <Panel title="Operator actions">
      <Text color="secondary">Queue more analysis of this sample. Nothing runs on this host; every job goes to an isolated worker.</Text>
      <HStack gap={2} wrap="wrap">
        <Button label="Detonate in sandbox" variant="secondary" isDisabled={!a.payload.dynamic} isLoading={busy === 'sandbox'} onClick={() => run('sandbox')} />
        <Button label="Decompile with Ghidra" variant="secondary" isDisabled={a.payload.kind === 'shell script'} isLoading={busy === 'ghidra'} onClick={() => run('ghidra')} />
        <Button label="Generate PDF report" variant="secondary" isLoading={busy === 'pdf'} onClick={() => run('pdf')} />
        <Button label="Publish to GitHub…" variant="secondary" isLoading={busy === 'github'} onClick={() => setConfirmPublish(true)} />
      </HStack>
      {!a.payload.dynamic && <Text type="supporting">This sample has no dynamic route (static-only), so it cannot be detonated.</Text>}
      {done && <Banner status="success" title={done} description="Mock: nothing was actually queued." isDismissable onDismiss={() => setDone(null)} />}
      <AlertDialog
        isOpen={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish to Xore/honeypot?"
        description="The sample and its analysis become public in the GitHub repository and are submitted to third-party scanners. This cannot be undone from the dashboard."
        actionLabel="Publish"
        onAction={async () => {
          setConfirmPublish(false)
          await run('github')
        }}
      />
    </Panel>
  )
}
