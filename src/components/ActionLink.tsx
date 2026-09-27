import { Button } from '@astryxdesign/core/Button'

/** A link that is an action (go to the full list, open the report, back to
 * the list) rather than a piece of data: drawn as a button so it reads as
 * something to press. Links that are data (an address, a hash, a name in a
 * table or a sentence) stay links. */
export function ActionLink({ href, children, external = false }: { href: string; children: string; external?: boolean }) {
  return <Button label={children} href={href} size="sm" variant="secondary" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />
}
