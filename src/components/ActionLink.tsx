import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

/** A link that is an action (go to the full list, open the report, back to
 * the list) rather than a piece of data: drawn as a button so it reads as
 * something to press. Links that are data (an address, a hash, a name in a
 * table or a sentence) stay links. One that leaves the dashboard opens in a
 * new tab and carries the icon that says so. `label` names it for assistive
 * tech when the visible text needs its context (several "Result" links in
 * one list). */
export function ActionLink({ href, children, label, external = false }: { href: string; children: string; label?: string; external?: boolean }) {
  return (
    <Button label={label ?? children} href={href} size="sm" variant="secondary" {...(external ? { target: '_blank', rel: 'noopener noreferrer', endContent: <Icon icon={ArrowTopRightOnSquareIcon} size="sm" /> } : {})}>
      {label ? children : undefined}
    </Button>
  )
}
