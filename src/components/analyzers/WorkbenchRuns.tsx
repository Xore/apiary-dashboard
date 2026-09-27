import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { List, ListItem } from '@astryxdesign/core/List'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { useRouter } from '@tanstack/react-router'
import { setRunChild } from '#/data/queries'
import type { RunState, WorkbenchRun, WorkbenchRunChild } from '#/data/types'
import { formatDateTime } from '#/lib/format'
import { useGuardedAction } from '#/lib/useGuardedAction'
import { ActionLink } from '../ActionLink'
import { EntityLink } from '../EntityLink'

export const RUN_STATE_COLOR = { queued: 'default', running: 'blue', succeeded: 'green', failed: 'red', cancelled: 'default', skipped: 'default' } as const satisfies Record<RunState, string>

/** What a run's banner says once queued: a new run, or the identical one
 * already in flight that the backend reused. */
export function queuedMessage({ run, reused }: { run: WorkbenchRun; reused: boolean }): { title: string; description: string } {
  const what = `${run.recipeName ?? run.children.map((c) => c.label).join(', ')} on ${run.hash.slice(0, 12)}…`
  return reused ? { title: `An identical run is already in flight (${run.id})`, description: `Nothing new was queued; follow that one. ${what}` } : { title: `Run ${run.id} queued`, description: what }
}

function ChildRow({ run, child }: { run: WorkbenchRun; child: WorkbenchRunChild }) {
  const router = useRouter()
  const { error, guard, clearError } = useGuardedAction()
  const [busy, setBusy] = useState(false)
  const act = async (action: 'retry' | 'cancel') => {
    setBusy(true)
    try {
      await guard(() => setRunChild(run.id, child.analyzerId, action))
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }
  return (
    <ListItem
      label={
        <HStack gap={2} vAlign="center">
          <Token size="sm" color={RUN_STATE_COLOR[child.state]} label={child.state} />
          <Text>{child.label}</Text>
        </HStack>
      }
      description={
        <VStack gap={0.5}>
          <Text type="supporting">{[child.summary ?? child.reason, `${child.attempts} ${child.attempts === 1 ? 'attempt' : 'attempts'}`, `updated ${formatDateTime(child.updatedAt)}`].filter(Boolean).join(' · ')}</Text>
          {error && <Banner status="error" title="Not changed" description={error} isDismissable onDismiss={clearError} />}
        </VStack>
      }
      endContent={
        <HStack gap={1}>
          {child.resultHref && <ActionLink href={child.resultHref}>Result</ActionLink>}
          {child.retryable && <Button label="Retry" size="sm" variant="secondary" isLoading={busy} onClick={() => void act('retry')} />}
          {child.cancelable && <Button label="Cancel" size="sm" variant="secondary" isLoading={busy} onClick={() => void act('cancel')} />}
        </HStack>
      }
    />
  )
}

/** The operator's own runs, each with its analyzers' progress: results to
 * open, failures to retry, work still queued to cancel. */
export function WorkbenchRuns({ runs }: { runs: WorkbenchRun[] | undefined }) {
  if (!runs)
    return (
      <VStack gap={3} aria-busy>
        {[0, 1, 2].map((i) => (
          <VStack key={i} gap={1.5}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="100%" height={48} />
          </VStack>
        ))}
      </VStack>
    )
  if (!runs.length) return <Text type="supporting">No runs yet. Start one with New analysis run.</Text>
  return (
    <VStack gap={4}>
      {runs.slice(0, 5).map((run) => (
        <VStack key={run.id} gap={1.5}>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Token size="sm" color={RUN_STATE_COLOR[run.state]} label={run.state} />
            <Text weight="semibold">{run.label}</Text>
            {run.recipeName && <Token size="sm" color="purple" label={run.recipeName} />}
          </HStack>
          <HStack gap={2} wrap="wrap" vAlign="center">
            <EntityLink kind="payload" id={run.hash}>
              <Text type="code">{`${run.hash.slice(0, 16)}…`}</Text>
            </EntityLink>
            <Text type="supporting">{`${run.payloadKind} · started ${formatDateTime(run.createdAt)}`}</Text>
          </HStack>
          <List density="compact" hasDividers>
            {run.children.map((child) => (
              <ChildRow key={child.analyzerId} run={run} child={child} />
            ))}
          </List>
        </VStack>
      ))}
    </VStack>
  )
}
