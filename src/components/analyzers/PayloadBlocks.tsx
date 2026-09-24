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
import { AnalysisRunDialog } from '../dialogs/AnalysisRunDialog'
import { EntityLink } from '../EntityLink'
import { ADMIN_REQUIRED, useIsAdmin } from '#/lib/session'
import { useGuardedAction } from '#/lib/useGuardedAction'

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
  const isAdmin = useIsAdmin()
  const { error, guard, clearError } = useGuardedAction()
  const [busy, setBusy] = useState<PayloadAction | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const run = async (action: PayloadAction) => {
    setBusy(action)
    try {
      const queued = await guard(() => queuePayloadAction(a.payload.hash, action))
      if (queued) setDone(queued)
    } finally {
      setBusy(null)
    }
  }
  return (
    <Panel title="Operator actions">
      <Text color="secondary">Queue more analysis of this sample. Nothing runs on this host; every job goes to an isolated worker.</Text>
      <HStack gap={2} wrap="wrap">
        <Button label="New analysis run" isDisabled={!isAdmin} tooltip={isAdmin ? undefined : ADMIN_REQUIRED} onClick={() => setAnalyzing(true)} />
        <Button label="Generate PDF report" variant="secondary" isLoading={busy === 'pdf'} isDisabled={!isAdmin} tooltip={isAdmin ? undefined : ADMIN_REQUIRED} onClick={() => run('pdf')} />
        <Button label="Publish to GitHub…" variant="secondary" isLoading={busy === 'github'} isDisabled={!isAdmin} tooltip={isAdmin ? undefined : ADMIN_REQUIRED} onClick={() => setConfirmPublish(true)} />
      </HStack>
      <AnalysisRunDialog isOpen={analyzing} onOpenChange={setAnalyzing} initialHash={a.payload.hash} onQueued={(queued) => setDone(`Analysis run ${queued.id} queued (${queued.recipe ?? ''}).`)} />
      {error && <Banner status="error" title="Not queued" description={error} isDismissable onDismiss={clearError} />}
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
