import { HStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import type { ContainerState, FeedState } from '#/data/types'

const FEED = {
  fresh: ['success', 'fresh'],
  delayed: ['warning', 'delayed'],
  stale: ['error', 'stale'],
  silent: ['error', 'silent'],
} as const satisfies Record<FeedState, readonly [string, string]>

const FEED_HINT: Record<FeedState, string> = {
  fresh: 'Newest event under two minutes old',
  delayed: 'Newest event over two minutes old',
  stale: 'Newest event over fifteen minutes old',
  silent: 'No event for over two hours',
}

/** Sensor feed freshness: dot plus label, never color alone. */
export function FeedStateLabel({ state }: { state: FeedState }) {
  const [variant, label] = FEED[state]
  return (
    <HStack gap={1.5} vAlign="center">
      <StatusDot variant={variant} label={label} tooltip={FEED_HINT[state]} />
      <Text>{label}</Text>
    </HStack>
  )
}

const CONTAINER = {
  running: 'success',
  restarting: 'warning',
  exited: 'error',
  unknown: 'neutral',
} as const satisfies Record<ContainerState, string>

export function ContainerStateLabel({ name, state, exitCode }: { name: string; state: ContainerState; exitCode?: number }) {
  const label = state === 'exited' && exitCode !== undefined ? `exited (${exitCode})` : state
  return (
    <HStack gap={1.5} vAlign="center">
      <StatusDot variant={CONTAINER[state]} label={label} tooltip={state === 'unknown' ? "Outside the services adapter's allowlist: no live state is reported" : label} />
      <Text type="code">{name}</Text>
    </HStack>
  )
}
