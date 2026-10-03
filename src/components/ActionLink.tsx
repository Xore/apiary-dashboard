import { Link } from '@astryxdesign/core/Link'

/** A link to somewhere the analyst goes next (the full list, the report,
 * back to the list), set apart from the text around it: Astryx's standalone
 * Link. Buttons are for actions that change something; a link that only
 * opens another page is a link (Astryx Button guidance). One that leaves the
 * dashboard opens in a new tab and carries Astryx's external-link icon.
 * `label` names it for assistive tech only when the visible text needs its
 * context (several "Result" links in one list). */
export function ActionLink({ href, children, label, external = false }: { href: string; children: string; label?: string; external?: boolean }) {
  return (
    <Link href={href} label={label} isStandalone isExternalLink={external}>
      {children}
    </Link>
  )
}
