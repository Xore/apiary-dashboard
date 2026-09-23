import { Token } from '@astryxdesign/core/Token'
import type { Severity } from '#/data/types'

const COLORS = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
  info: 'gray',
} as const satisfies Record<Severity, string>

export function SeverityToken({ severity }: { severity: Severity }) {
  return <Token label={severity} size="sm" color={COLORS[severity]} />
}
