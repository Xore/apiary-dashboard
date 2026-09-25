// Families of sibling pages that share one top-bar tab set: each page of a
// family shows the same tabs, with itself selected, and the sidebar keeps a
// single entry for the family. A tab with sections is a dropdown under its
// top-bar entry (the Astryx TopNav "Multiple Dropdowns" block).
import { BoltIcon, ListBulletIcon, TableCellsIcon, TvIcon } from '@heroicons/react/24/outline'
import { linkTabs } from '#/components/ViewTabs'
import type { ViewTab, ViewTabsFn } from '#/components/ViewTabs'

/** The tab whose page (or one of whose section pages) this path is. */
function currentOf(tabs: ViewTab[], pathname: string, search: Record<string, unknown>): { value: string; section?: string } {
  const matches = (href: string) => {
    const [path, query = ''] = href.split('?') as [string, string?]
    if (path !== pathname) return false
    // A query-string tab (`?tab=static`) matches only that view; a bare one
    // matches when no other tab's query does.
    const params = new URLSearchParams(query)
    return [...params].every(([key, value]) => search[key] === value)
  }
  const scored = tabs.flatMap((tab) => [
    ...(tab.href ? [{ tab: tab.id, section: undefined, href: tab.href }] : []),
    ...(tab.sections ?? []).flatMap((s) => (s.href ? [{ tab: tab.id, section: s.id, href: s.href }] : [])),
  ])
  const [hit] = scored.filter((c) => matches(c.href)).sort((a, b) => b.href.length - a.href.length) as Array<(typeof scored)[number] | undefined>
  return hit ? { value: hit.tab, section: hit.section } : { value: tabs[0].id }
}

function family(label: string, tabs: ViewTab[]): ViewTabsFn {
  return linkTabs({ label, tabs: () => tabs, current: ({ pathname, search }) => currentOf(tabs, pathname, search) })
}

// ---- Reports studio ---------------------------------------------------------

export const REPORT_TABS: ViewTab[] = [
  { id: 'generate', label: 'Generate', href: '/reports/generate' },
  { id: 'history', label: 'History', href: '/reports/history' },
  { id: 'templates', label: 'Templates', href: '/reports/templates' },
  { id: 'library', label: 'Library', href: '/reports/library' },
]
export const reportTabs = family('Reports studio', REPORT_TABS)

// ---- Analysis results -------------------------------------------------------

const RESULTS = '/payload-workbench/results'

/** Every analyzer's results; the result lists of CAPE, GitHub and RevDeck
 * and the sandbox's live view are pages of their own under the same tabs. */
export const ANALYSIS_TABS: ViewTab[] = [
  { id: 'workbench', label: 'Workbench', href: RESULTS },
  { id: 'static', label: 'Static analysis', href: `${RESULTS}?tab=static` },
  { id: 'yara', label: 'YARA', href: `${RESULTS}?tab=yara` },
  {
    id: 'sandbox',
    label: 'Sandbox',
    sections: [
      { id: 'results', label: 'Results', icon: TableCellsIcon, href: `${RESULTS}?tab=sandbox` },
      { id: 'live', label: 'Live view', icon: TvIcon, href: '/sandbox/vnc' },
    ],
  },
  { id: 'ghidra', label: 'Ghidra', href: `${RESULTS}?tab=ghidra` },
  { id: 'cape', label: 'CAPE', href: '/cape' },
  { id: 'github', label: 'GitHub analysis', href: '/github-analysis' },
  { id: 'revdeck', label: 'RevDeck', href: '/revdeck' },
]

/** Analysis results tabs, with the results page's own counts when loaded. */
export function analysisTabs(counts?: (id: string, data: unknown) => number | undefined): ViewTabsFn {
  return linkTabs({
    label: 'Analysis results views',
    tabs: (data) => ANALYSIS_TABS.map((tab) => ({ ...tab, count: counts?.(tab.id, data) })),
    current: ({ pathname, search }) => currentOf(ANALYSIS_TABS, pathname, search),
  })
}

// ---- Source & pipeline health -----------------------------------------------

/** What the platform reports as wrong with itself: collection health, events
 * ingest could not store, and problems operators filed. */
export const HEALTH_TABS: ViewTab[] = [
  { id: 'sources', label: 'Sources & pipeline', href: '/source-health' },
  { id: 'dead-letters', label: 'Dead letters', href: '/dead-letters' },
  { id: 'problem-reports', label: 'Problem reports', href: '/problem-reports' },
]
export const healthTabs = family('Source & pipeline health views', HEALTH_TABS)

// ---- Indicators -------------------------------------------------------------

/** The per-execution command list is a section of the Commands indicator:
 * the unique commands, or every time one ran. */
export const COMMAND_SECTIONS = [
  { id: 'unique', label: 'Unique commands', icon: BoltIcon, href: '/iocs?kind=command' },
  { id: 'executed', label: 'Every execution', icon: ListBulletIcon, href: '/commands' },
] as const

/** The indicator hub's kinds, as its top-bar tabs name them. */
export const IOC_KINDS = [
  { id: 'hash', label: 'Hashes' },
  { id: 'domain', label: 'Domains' },
  { id: 'url', label: 'URLs' },
  { id: 'credential', label: 'Credentials' },
  { id: 'command', label: 'Commands' },
  { id: 'fingerprint', label: 'Fingerprints' },
  { id: 'cve', label: 'CVEs' },
  { id: 'signature', label: 'Signatures' },
] as const

/** A kind's tab; Commands is a dropdown of its two sections. */
export const iocKindTab = (kind: (typeof IOC_KINDS)[number], count?: number): ViewTab => ({
  id: kind.id,
  label: kind.label,
  count,
  ...(kind.id === 'command' ? { sections: COMMAND_SECTIONS } : { href: kind.id === 'hash' ? '/iocs' : `/iocs?kind=${kind.id}` }),
})

/** The hub's tabs on the pages nested under it (every command execution). */
export const indicatorTabs = family('Indicator kinds', IOC_KINDS.map((kind) => iocKindTab(kind)))
