// "Open in": the deployment's other tools, for one event or file. Each
// opens in a new tab: they are other applications, with their own sign-in.
// Nothing renders when no tool applies.
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu'
import { Icon } from '@astryxdesign/core/Icon'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import type { ToolLink } from '#/lib/toolLinks'

const open = (href: string) => void window.open(href, '_blank', 'noopener,noreferrer')

export function OpenInMenu({ links, compact = false }: { links: ToolLink[]; compact?: boolean }) {
  if (links.length === 0) return null
  return (
    <DropdownMenu
      placement="below"
      alignment="end"
      menuWidth={280}
      button={{
        label: 'Open in',
        icon: <Icon icon={ArrowTopRightOnSquareIcon} size="sm" />,
        size: 'sm',
        variant: compact ? 'ghost' : 'secondary',
        ...(compact ? { isIconOnly: true, tooltip: 'Open in another tool' } : {}),
      }}
    >
      {links.map((link) => (
        <DropdownMenuItem key={link.tool} label={link.tool} description={link.purpose} endContent={<Icon icon={ArrowTopRightOnSquareIcon} size="sm" />} onClick={() => open(link.href)} />
      ))}
    </DropdownMenu>
  )
}
