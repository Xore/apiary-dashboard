// Sidebar information architecture. Sections, order, labels, and routes match
// the canonical frontend-next src/lib/nav.ts @62ee45d; icons are heroicons
// equivalents of its inline feather paths.
import {
  BellAlertIcon,
  BellIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CpuChipIcon,
  DocumentIcon,
  DocumentTextIcon,
  FingerPrintIcon,
  GlobeAltIcon,
  HomeIcon,
  KeyIcon,
  ListBulletIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PlayCircleIcon,
  PresentationChartLineIcon,
  ServerStackIcon,
  ShareIcon,
  SignalIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  StarIcon,
} from '@heroicons/react/24/outline'
import type { IconType } from '@astryxdesign/core/Icon'

export type NavItem = {
  label: string
  to: string
  icon: IconType
}

export type NavSection = {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Monitor',
    items: [
      { label: 'Overview', to: '/', icon: HomeIcon },
      { label: 'ML anomalies', to: '/ml-anomalies', icon: CpuChipIcon },
      { label: 'LLM analysis', to: '/llm-analysis', icon: ChatBubbleLeftRightIcon },
      { label: 'Agent campaigns', to: '/agent-campaigns', icon: BellAlertIcon },
      { label: 'Auth-failure events', to: '/auth-events', icon: LockClosedIcon },
    ],
  },
  {
    label: 'Investigate',
    items: [
      { label: 'Event explorer', to: '/events', icon: ListBulletIcon },
      { label: 'Attack sources', to: '/ips', icon: GlobeAltIcon },
      { label: 'Campaigns', to: '/campaigns', icon: ShareIcon },
      { label: 'Infrastructure clusters', to: '/clusters', icon: Squares2X2Icon },
      { label: 'Attacker identities', to: '/attackers', icon: FingerPrintIcon },
      { label: 'Kill-chain analytics', to: '/kill-chain', icon: PresentationChartLineIcon },
      { label: 'Sensor detail', to: '/sensors', icon: ServerStackIcon },
      { label: 'Session recordings', to: '/recordings', icon: PlayCircleIcon },
      { label: 'Indicators', to: '/iocs', icon: MagnifyingGlassIcon },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Alerts', to: '/alerts', icon: BellIcon },
      { label: 'Source & pipeline health', to: '/source-health', icon: SignalIcon },
      { label: 'Fleet topology', to: '/topology', icon: Square3Stack3DIcon },
      { label: 'Event history', to: '/history', icon: ClockIcon },
    ],
  },
  {
    label: 'Reports',
    items: [{ label: 'Reports studio', to: '/reports', icon: DocumentTextIcon }],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Canarytokens', to: '/canarytokens', icon: StarIcon },
      { label: 'Bait credentials', to: '/credentials', icon: KeyIcon },
    ],
  },
  {
    label: 'Evidence',
    items: [
      { label: 'Captured payloads', to: '/payloads', icon: DocumentIcon },
      { label: 'Analysis results', to: '/payload-workbench/results', icon: ChartBarSquareIcon },
    ],
  },
]

// Drill-down routes with no sidebar entry of their own. First match wins.
const PAGE_PREFIXES: Array<[string, string]> = [
  ['/payloads/', 'Payload'],
  ['/sources/', 'Source IP'],
  ['/events/', 'Event'],
  ['/payload-analysis/', 'Payload'],
  ['/payload-workbench/', 'Analysis results'],
  ['/sandbox/', 'Sandbox result'],
  ['/ghidra/', 'Ghidra result'],
  ['/revdeck/', 'RevDeck result'],
  ['/cape/', 'CAPE result'],
  ['/github-analysis/', 'GitHub analysis'],
  ['/sessions/', 'Session'],
  ['/event/', 'Event'],
  ['/investigate/ip/', 'Source IP'],
  ['/networks/', 'Network'],
  ['/asn/', 'Autonomous system'],
  ['/campaigns/', 'Campaign'],
  ['/clusters/', 'Cluster'],
  ['/identities/', 'Attacker identity'],
  ['/investigate/cidr/', 'Network'],
  ['/investigate/cluster', 'Cluster'],
  ['/tty-replay/', 'Session recording'],
  ['/recordings/', 'Session recording'],
  ['/ioc/', 'Indicator'],
  ['/alerts/', 'Alert'],
  ['/ml-anomalies/', 'ML anomaly'],
  ['/llm-analysis/', 'LLM analysis'],
  ['/agent-campaigns/', 'Agent campaign'],
  ['/auth-events/', 'Auth failure'],
  ['/canarytokens/triggers/', 'Canarytoken trigger'],
  ['/canarytokens/', 'Canarytoken'],
  ['/credentials/', 'Bait credential'],
  ['/dead-letters/', 'Dead letter'],
  ['/problem-reports/', 'Problem report'],
  ['/reports/definitions/', 'Report definition'],
  ['/reports/generated/', 'Generated report'],
]

// Routes without a nav item that still deserve a proper label.
const PAGE_LABELS: Record<string, string> = {
  '/settings': 'Settings',
  '/search': 'Search',
  '/dead-letters': 'Ingest dead letters',
  '/commands': 'Executed commands',
  '/problem-reports': 'Problem reports',
  '/sandbox/vnc': 'Sandbox live view',
  '/revdeck': 'RevDeck',
  '/cape': 'CAPE',
  '/github-analysis': 'GitHub analysis',
}

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)
// List pages reached from settings rather than the sidebar.
const UNLISTED_LISTS = ['/dead-letters', '/problem-reports']

/** The sidebar entry a pathname rolls up to: detail pages highlight (and
 * breadcrumb under) their parent. */
export function navHrefFor(pathname: string): string {
  if (pathname.startsWith('/payload-analysis') || pathname.startsWith('/payloads/')) return '/payloads'
  // Analyzer lists and their result pages all roll up to Analysis results.
  if (
    pathname.startsWith('/payload-workbench/') ||
    pathname.startsWith('/sandbox/') ||
    pathname.startsWith('/ghidra/') ||
    /^\/(revdeck|cape|github-analysis)(\/|$)/.test(pathname)
  ) {
    return '/payload-workbench/results'
  }
  if (pathname.startsWith('/sessions/') || pathname.startsWith('/event/') || pathname.startsWith('/events/')) return '/events'
  if (pathname.startsWith('/sensors/')) return '/sensors'
  if (pathname.startsWith('/investigate/ip/') || pathname.startsWith('/sources/')) return '/ips'
  if (pathname.startsWith('/investigate/cidr/') || pathname.startsWith('/networks/') || pathname.startsWith('/campaigns/')) {
    return '/campaigns'
  }
  if (pathname.startsWith('/investigate/cluster') || pathname.startsWith('/clusters/') || pathname.startsWith('/asn/')) {
    return '/clusters'
  }
  if (pathname.startsWith('/identities/')) return '/attackers'
  if (pathname.startsWith('/tty-replay/')) return '/recordings'
  // Indicator pages and the per-execution command list belong to the hub.
  if (pathname.startsWith('/ioc/') || pathname === '/commands' || pathname === '/investigate/lookup') return '/iocs'
  // Any other detail page rolls up to the list it lives under.
  const list = [...ALL_ITEMS.map((item) => item.to), ...UNLISTED_LISTS]
    .filter((to) => to !== '/' && pathname.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)
  return list.length ? list[0] : pathname
}

export function navItemFor(pathname: string): NavItem | undefined {
  const target = navHrefFor(pathname)
  for (const section of NAV_SECTIONS) {
    const hit = section.items.find((item) => item.to === target)
    if (hit) return hit
  }
  return undefined
}

/** Section label for a pathname; drives the topbar breadcrumb. */
export function sectionFor(pathname: string): string {
  const target = navHrefFor(pathname)
  for (const section of NAV_SECTIONS) {
    if (section.items.some((item) => item.to === target)) return section.label
  }
  return ''
}

/** Page label for a pathname, with prefix fallbacks for drill-downs. */
export function pageFor(pathname: string): string {
  for (const section of NAV_SECTIONS) {
    const hit = section.items.find((item) => item.to === pathname)
    if (hit) return hit.label
  }
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  // A sensor page is named after its sensor.
  if (pathname.startsWith('/sensors/')) return decodeURIComponent(pathname.split('/')[2])
  for (const [prefix, label] of PAGE_PREFIXES) {
    if (pathname.startsWith(prefix)) return label
  }
  return 'Dashboard'
}
