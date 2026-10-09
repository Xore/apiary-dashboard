import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import type { Severity } from '#/data/types'

const COLORS = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
  info: 'gray',
} as const satisfies Record<Severity, string>

/** A missing severity renders as an em dash, never as a token: the backend
 * did not classify the row, so no colour or label may claim one. */
export function SeverityToken({ severity }: { severity?: Severity }) {
  if (!severity) return <Text type="supporting">—</Text>
  return <Token label={severity} size="sm" color={COLORS[severity]} />
}
