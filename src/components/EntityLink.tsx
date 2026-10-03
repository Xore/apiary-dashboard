import type { ReactNode } from 'react'
import { ContextMenu } from '@astryxdesign/core/ContextMenu'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { useNavigate } from '@tanstack/react-router'
import { ENTITIES } from '#/lib/entities'
import type { EntityKind } from '#/lib/entities'

type EntityLinkProps = {
  kind: EntityKind
  id: string
  /** Visible text; defaults to the id. */
  children?: ReactNode
}

/** Any value that can be drilled into. Click opens its page (or, for values
 * without a page yet, the events carrying it); right-click offers every
 * pivot the registry knows. */
export function EntityLink({ kind, id, children }: EntityLinkProps) {
  const navigate = useNavigate()
  const def = ENTITIES[kind]
  const href = def.href?.(id)
  const events = def.events?.(id)
  const target = href ?? events
  // A hash or fingerprint breaks anywhere instead of pushing the page wider
  // (a phone has no room for 64 hex digits); past three lines it truncates,
  // whole on hover, and the menu copies it.
  const label = children ?? (def.isCode ? <Text type="code" color="inherit" maxLines={3} wordBreak="break-all">{id}</Text> : id)

  const items = [
    ...(href ? [{ label: `Open ${def.noun}`, onClick: () => void navigate({ href }) }] : []),
    ...(href ? [{ label: 'Open in new tab', onClick: () => window.open(href, '_blank', 'noopener') }] : []),
    ...(events ? [{ label: 'Events with this', onClick: () => void navigate({ href: events }) }] : []),
    { label: 'Copy value', onClick: () => void navigator.clipboard.writeText(id) },
  ]

  return (
    <ContextMenu items={items} size="sm" menuWidth="200px" label={`${def.noun} ${id}`}>
      {target ? <Link href={target}>{label}</Link> : label}
    </ContextMenu>
  )
}
