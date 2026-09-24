// The one list the settings dialog reads: panels (grouped by who they
// affect) for the navigation, and settings (one per row) for the rows and
// for search. Renaming a setting here renames its row and its search result
// together.
import type { ComponentType, SVGProps } from 'react'
import {
  AdjustmentsHorizontalIcon,
  ArchiveBoxXMarkIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  Bars3BottomLeftIcon,
  BellAlertIcon,
  BellIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CpuChipIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  HomeIcon,
  KeyIcon,
  LinkIcon,
  MagnifyingGlassCircleIcon,
  MapIcon,
  MegaphoneIcon,
  NoSymbolIcon,
  PaintBrushIcon,
  QueueListIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  SwatchIcon,
  TableCellsIcon,
  TagIcon,
  UserCircleIcon,
  UserIcon,
  UsersIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/outline'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export type PaneId =
  | 'account'
  | 'appearance'
  | 'navigation'
  | 'time'
  | 'map'
  | 'branding'
  | 'behavior'
  | 'honeypot'
  | 'users'
  | 'services'
  | 'report-presets'
  | 'canarytokens'
  | 'elasticsearch'
  | 'dead-letters'
  | 'history'
  | 'audit'

export type Panel = { id: PaneId; label: string; description: string; icon: IconComponent }

/** Grouped by who a change affects: never interleave "only me" with "everyone". */
export const PANEL_GROUPS: Array<{ label: string; scope: string; panels: Panel[] }> = [
  {
    label: 'Personal',
    scope: 'Only you',
    panels: [
      { id: 'account', label: 'Account', description: 'Your identity as the auth service provides it. Credentials are managed there, never here.', icon: UserCircleIcon },
      { id: 'appearance', label: 'Appearance', description: 'Theme, density and motion of the dashboard.', icon: PaintBrushIcon },
      { id: 'navigation', label: 'Navigation & tables', description: 'Where you land, and how tables and detail pages behave.', icon: ViewColumnsIcon },
      { id: 'time', label: 'Time & live data', description: 'Timezone, clock format, refresh cadence and notifications.', icon: ClockIcon },
      { id: 'map', label: 'Investigation', description: 'Defaults for investigating sources and campaigns.', icon: MapIcon },
    ],
  },
  {
    label: 'Administration',
    scope: 'Everyone',
    panels: [
      { id: 'branding', label: 'Branding & text', description: 'Product labels, help links, notices and footer copy. Plain text; https links only.', icon: TagIcon },
      { id: 'behavior', label: 'Dashboard defaults', description: 'Safe, bounded defaults for every user.', icon: AdjustmentsHorizontalIcon },
      { id: 'honeypot', label: 'Honeypot operations', description: 'Staged operational thresholds. Saving never restarts anything.', icon: ShieldCheckIcon },
      { id: 'users', label: 'Users', description: 'Read-only view of who uses the dashboard. Accounts live in the auth service.', icon: UsersIcon },
      { id: 'services', label: 'Services', description: 'Live container status for sensors and workers, with start, stop and restart.', icon: ServerStackIcon },
      { id: 'report-presets', label: 'Report templates', description: 'Report templates and saved definitions live with the reports.', icon: DocumentTextIcon },
      { id: 'canarytokens', label: 'Canarytokens', description: 'Honeytokens planted outside this honeypot.', icon: StarIcon },
      { id: 'elasticsearch', label: 'Event search', description: 'Raw query search across every indexed document.', icon: MagnifyingGlassCircleIcon },
      { id: 'dead-letters', label: 'Ingest dead letters', description: 'Documents Elasticsearch rejected.', icon: ArchiveBoxXMarkIcon },
      { id: 'history', label: 'Configuration history', description: 'Retained configuration revisions, with rollback.', icon: ArrowUturnLeftIcon },
      { id: 'audit', label: 'Audit log', description: 'Every settings change, with actor, fields and result.', icon: ClipboardDocumentListIcon },
    ],
  },
]

export const PANELS: Panel[] = PANEL_GROUPS.flatMap((group) => group.panels)
export const PANE_IDS: PaneId[] = PANELS.map((panel) => panel.id)
export const panelOf = (id: PaneId): Panel => PANELS.find((panel) => panel.id === id)!
export const isAdminPanel = (id: PaneId) => PANEL_GROUPS[1].panels.some((panel) => panel.id === id)

export type Setting = { id: string; panel: PaneId; title: string; description: string; icon: IconComponent; keywords?: string }

export const SETTINGS: Setting[] = [
  { id: 'name', panel: 'account', title: 'Name', description: 'As the auth service knows you.', icon: UserIcon, keywords: 'profile identity' },
  { id: 'email', panel: 'account', title: 'Email', description: 'Where alert mail goes.', icon: EnvelopeIcon },
  { id: 'roles', panel: 'account', title: 'Roles', description: 'What you may change. Administration needs admin.', icon: ShieldCheckIcon, keywords: 'admin permission' },
  { id: 'session', panel: 'account', title: 'Session', description: 'How you signed in.', icon: KeyIcon, keywords: 'oidc sign out login' },
  { id: 'theme', panel: 'appearance', title: 'Theme', description: 'System follows your operating system.', icon: SwatchIcon, keywords: 'dark light mode color' },
  { id: 'density', panel: 'appearance', title: 'Density', description: 'Compact fits more rows on screen.', icon: TableCellsIcon, keywords: 'compact spacing' },
  { id: 'motion', panel: 'appearance', title: 'Motion', description: 'Reduced turns off animation.', icon: SparklesIcon, keywords: 'animation reduce' },
  { id: 'landing', panel: 'navigation', title: 'Landing page', description: 'Where the dashboard opens.', icon: HomeIcon, keywords: 'start home default page' },
  { id: 'rowsPerPage', panel: 'navigation', title: 'Rows per page', description: 'For every list.', icon: QueueListIcon, keywords: 'table pagination' },
  { id: 'newTab', panel: 'navigation', title: 'Open detail pages in a new tab', description: 'Clicking a row opens its page in a new tab.', icon: ArrowTopRightOnSquareIcon },
  { id: 'timezone', panel: 'time', title: 'Timezone', description: 'Times across the dashboard.', icon: GlobeAltIcon, keywords: 'utc local' },
  { id: 'clock', panel: 'time', title: 'Clock', description: '24-hour or 12-hour times.', icon: ClockIcon, keywords: '24h 12h am pm' },
  { id: 'timestamps', panel: 'time', title: 'Timestamps', description: 'Absolute times, or “5 minutes ago”.', icon: CalendarDaysIcon, keywords: 'relative absolute' },
  { id: 'refresh', panel: 'time', title: 'Live refresh', description: 'Seconds between live updates, 10 to 300.', icon: ArrowPathIcon, keywords: 'polling interval' },
  { id: 'notifyCritical', panel: 'time', title: 'Critical alerts', description: 'A browser notification for every critical alert.', icon: BellAlertIcon, keywords: 'notification' },
  { id: 'notifyCanary', panel: 'time', title: 'Canarytoken fires', description: 'A browser notification when a planted token phones home.', icon: BellIcon, keywords: 'notification canary' },
  { id: 'defaultWindow', panel: 'map', title: 'Default window', description: 'The time range an investigation opens with.', icon: CalendarDaysIcon, keywords: 'range time investigation' },
  { id: 'productName', panel: 'branding', title: 'Product name', description: 'Shown in the top bar and page titles.', icon: TagIcon, keywords: 'brand title' },
  { id: 'helpUrl', panel: 'branding', title: 'Help link', description: 'An https link to your runbook.', icon: LinkIcon, keywords: 'docs runbook' },
  { id: 'notice', panel: 'branding', title: 'Shell notice', description: 'A banner every user sees until you clear it.', icon: MegaphoneIcon, keywords: 'announcement banner' },
  { id: 'footer', panel: 'branding', title: 'Footer', description: 'Printed at the bottom of every page.', icon: Bars3BottomLeftIcon },
  { id: 'defaults', panel: 'behavior', title: 'Bounded defaults', description: 'Window and rows per page for users who set nothing; their own choice always wins.', icon: AdjustmentsHorizontalIcon },
  { id: 'alertCooldown', panel: 'honeypot', title: 'Alert cooldown', description: 'Minutes before the same alert notifies again.', icon: BellIcon, keywords: 'throttle' },
  { id: 'blocklistTtl', panel: 'honeypot', title: 'Manual block lifetime', description: 'Hours a portbridge block lasts.', icon: NoSymbolIcon, keywords: 'blocklist ttl portbridge' },
  { id: 'sandboxConcurrency', panel: 'honeypot', title: 'Sandbox concurrency', description: 'Detonations that may run at once, 1 to 8.', icon: CpuChipIcon, keywords: 'parallel workers' },
  { id: 'llmDailyReport', panel: 'honeypot', title: 'LLM daily report', description: 'A model-written summary each morning.', icon: SparklesIcon, keywords: 'ai summary' },
  { id: 'users', panel: 'users', title: 'Dashboard users', description: 'Who signed in, with roles and last activity.', icon: UsersIcon, keywords: 'accounts' },
  { id: 'services', panel: 'services', title: 'Containers', description: 'Start, stop or restart a sensor or worker.', icon: ServerStackIcon, keywords: 'docker restart stop start' },
  { id: 'reportTemplates', panel: 'report-presets', title: 'Report library', description: 'Saved definitions and templates.', icon: DocumentTextIcon, keywords: 'reports presets' },
  { id: 'canary', panel: 'canarytokens', title: 'Canarytokens', description: 'Create and review planted tokens.', icon: StarIcon, keywords: 'honeytoken' },
  { id: 'eventSearch', panel: 'elasticsearch', title: 'Event history search', description: 'Lucene queries over every document.', icon: MagnifyingGlassCircleIcon, keywords: 'elasticsearch lucene raw query' },
  { id: 'deadLetters', panel: 'dead-letters', title: 'Dead letters', description: 'Review and purge rejected documents.', icon: ArchiveBoxXMarkIcon, keywords: 'ingest rejected' },
  { id: 'history', panel: 'history', title: 'Revisions', description: 'Roll a section back to an earlier revision.', icon: ArrowUturnLeftIcon, keywords: 'rollback' },
  { id: 'audit', panel: 'audit', title: 'Changes', description: 'Who changed which fields, and whether it worked.', icon: ClipboardDocumentListIcon, keywords: 'actor log' },
]

export const settingOf = (id: string): Setting => SETTINGS.find((setting) => setting.id === id)!

export function matchesSearch(setting: Setting, needle: string): boolean {
  const panel = panelOf(setting.panel)
  return `${setting.title} ${setting.description} ${setting.keywords ?? ''} ${panel.label}`.toLowerCase().includes(needle)
}
