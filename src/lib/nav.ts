// Sidebar information architecture. Sections, order, labels, and routes match
// the canonical frontend-next src/lib/nav.ts @62ee45d; icons are heroicons
// equivalents of its inline feather paths.
import {
  BellAlertIcon,
  BellIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CommandLineIcon,
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
      { label: 'Executed commands', to: '/commands', icon: CommandLineIcon },
      { label: 'Sensor detail', to: '/sensors', icon: ServerStackIcon },
      { label: 'Session recordings', to: '/recordings', icon: PlayCircleIcon },
      { label: 'Hash / IOC lookup', to: '/investigate/lookup', icon: MagnifyingGlassIcon },
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
      { label: 'Credentials', to: '/credentials', icon: KeyIcon },
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
  ['/payload-analysis/', 'Payload analysis'],
  ['/payload-workbench/', 'Analysis results'],
  ['/sandbox/', 'Sandbox result'],
  ['/ghidra/', 'Ghidra result'],
  ['/revdeck/', 'RevDeck result'],
  ['/cape/', 'CAPE result'],
  ['/github-analysis/', 'GitHub analysis'],
  ['/sessions/', 'Session replay'],
  ['/event/', 'Event detail'],
  ['/investigate/ip/', 'Attacker profile'],
  ['/investigate/cidr/', 'CIDR investigation'],
  ['/investigate/cluster', 'Cluster investigation'],
  ['/tty-replay/', 'Session recording'],
]

// Routes without a nav item that still deserve a proper label.
const PAGE_LABELS: Record<string, string> = {
  '/settings': 'Settings',
  '/search': 'Search',
  '/dead-letters': 'Ingest dead letters',
  '/problem-reports': 'Problem reports',
  '/sandbox/vnc': 'Sandbox live view',
  '/revdeck': 'RevDeck',
  '/cape': 'CAPE',
  '/github-analysis': 'GitHub analysis',
}

/** The sidebar entry a pathname rolls up to: detail pages highlight (and
 * breadcrumb under) their parent. */
export function navHrefFor(pathname: string): string {
  if (pathname.startsWith('/payload-analysis')) return '/payloads'
  // Analyzer lists and their result pages all roll up to Analysis results.
  if (
    pathname.startsWith('/payload-workbench/') ||
    pathname.startsWith('/sandbox/') ||
    pathname.startsWith('/ghidra/') ||
    /^\/(revdeck|cape|github-analysis)(\/|$)/.test(pathname)
  ) {
    return '/payload-workbench/results'
  }
  if (pathname.startsWith('/sessions/') || pathname.startsWith('/event/')) return '/events'
  if (pathname.startsWith('/sensors/')) return '/sensors'
  if (pathname.startsWith('/investigate/ip/')) return '/ips'
  if (pathname.startsWith('/investigate/cidr/') || pathname.startsWith('/investigate/cluster')) {
    return '/campaigns'
  }
  if (pathname.startsWith('/tty-replay/')) return '/recordings'
  return pathname
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
  if (pathname.startsWith('/sensors/')) return decodeURIComponent(pathname.slice('/sensors/'.length))
  for (const [prefix, label] of PAGE_PREFIXES) {
    if (pathname.startsWith(prefix)) return label
  }
  return 'Dashboard'
}
