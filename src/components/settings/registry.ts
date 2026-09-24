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
  FunnelIcon,
  MagnifyingGlassPlusIcon,
  SpeakerWaveIcon,
  SunIcon,
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
      { id: 'appearance', label: 'Appearance', description: 'Theme, palette, density, motion and readability.', icon: PaintBrushIcon },
      { id: 'navigation', label: 'Navigation & tables', description: 'Where you land, and how tables and detail pages behave.', icon: ViewColumnsIcon },
      { id: 'time', label: 'Time & live data', description: 'Time zone, clock, live updates, toasts and notifications.', icon: ClockIcon },
      { id: 'map', label: 'Investigation', description: 'Defaults for investigating, and the attack map.', icon: MapIcon },
    ],
  },
  {
    label: 'Administration',
    scope: 'Everyone',
    panels: [
      { id: 'branding', label: 'Branding & text', description: 'Product labels, help links, notices and footer copy. Plain text; https links only.', icon: TagIcon },
      { id: 'behavior', label: 'Dashboard defaults', description: 'Defaults, limits and features for every user.', icon: AdjustmentsHorizontalIcon },
      { id: 'honeypot', label: 'Honeypot operations', description: 'Staged operational thresholds. Saving never restarts anything.', icon: ShieldCheckIcon },
      { id: 'users', label: 'Users', description: 'Read-only view of who uses the dashboard. Accounts live in the auth service.', icon: UsersIcon },
      { id: 'services', label: 'Services', description: 'Live container status for sensors and workers, with start, stop and restart.', icon: ServerStackIcon },
      { id: 'report-presets', label: 'Report templates', description: 'Rename or re-describe the built-in report templates.', icon: DocumentTextIcon },
      { id: 'canarytokens', label: 'Canarytokens', description: 'Honeytokens planted outside this honeypot.', icon: StarIcon },
      { id: 'elasticsearch', label: 'Storage & search', description: 'Cluster storage, and raw query search across every document.', icon: MagnifyingGlassCircleIcon },
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
  { id: 'roles', panel: 'account', title: 'Roles', description: 'What you may change. Administration needs admin.', icon: ShieldCheckIcon, keywords: 'admin permission viewer' },
  { id: 'session', panel: 'account', title: 'Session', description: 'How you signed in.', icon: KeyIcon, keywords: 'oidc sign out login' },
  { id: 'theme', panel: 'appearance', title: 'Theme', description: 'System follows your operating system.', icon: SwatchIcon, keywords: 'dark light mode color' },
  { id: 'palette', panel: 'appearance', title: 'Accent palette', description: 'The accent colour, shared with the rest of the platform.', icon: PaintBrushIcon, keywords: 'color colour accent claude amber lavender lime neon ocean rose slate' },
  { id: 'density', panel: 'appearance', title: 'Density', description: 'Compact fits more rows on screen.', icon: TableCellsIcon, keywords: 'compact spacing' },
  { id: 'motion', panel: 'appearance', title: 'Motion', description: 'Reduced turns off animation.', icon: SparklesIcon, keywords: 'animation reduce' },
  { id: 'highContrast', panel: 'appearance', title: 'High contrast', description: 'Stronger borders and text for bright rooms and tired eyes.', icon: SunIcon, keywords: 'accessibility contrast' },
  { id: 'largeEvidenceText', panel: 'appearance', title: 'Larger evidence text', description: 'Bigger monospace for payloads, commands and raw records.', icon: MagnifyingGlassPlusIcon, keywords: 'font size accessibility code' },
  { id: 'wrapLongValues', panel: 'appearance', title: 'Wrap long values', description: 'Wrap long values in tables instead of cutting them off.', icon: Bars3BottomLeftIcon, keywords: 'truncate ellipsis overflow' },
  { id: 'landing', panel: 'navigation', title: 'Landing page', description: 'Where the dashboard opens.', icon: HomeIcon, keywords: 'start home default page' },
  { id: 'rowsPerPage', panel: 'navigation', title: 'Rows per page', description: 'For every list.', icon: QueueListIcon, keywords: 'table pagination' },
  { id: 'newTab', panel: 'navigation', title: 'Open detail pages in a new tab', description: 'Clicking a row opens its page in a new tab.', icon: ArrowTopRightOnSquareIcon },
  { id: 'rememberFilters', panel: 'navigation', title: 'Remember filters', description: 'Coming back to a list keeps the filters you left it with.', icon: FunnelIcon, keywords: 'preserve persist' },
  { id: 'collapsedSidebar', panel: 'navigation', title: 'Start with the sidebar collapsed', description: 'Icons only, for more room on small screens.', icon: ViewColumnsIcon, keywords: 'navigation compact' },
  { id: 'timezone', panel: 'time', title: 'Time zone', description: 'Times across the dashboard. Browser follows this device.', icon: GlobeAltIcon, keywords: 'utc local iana' },
  { id: 'clock', panel: 'time', title: 'Clock', description: '24-hour or 12-hour times.', icon: ClockIcon, keywords: '24h 12h am pm' },
  { id: 'timestamps', panel: 'time', title: 'Timestamps', description: 'Absolute times, or “5 minutes ago”.', icon: CalendarDaysIcon, keywords: 'relative absolute' },
  { id: 'autoRefresh', panel: 'time', title: 'Refresh automatically', description: 'Live pages update on their own.', icon: ArrowPathIcon, keywords: 'polling live' },
  { id: 'refresh', panel: 'time', title: 'Refresh every', description: 'Between live updates.', icon: ArrowPathIcon, keywords: 'polling interval seconds' },
  { id: 'liveToasts', panel: 'time', title: 'Operational toasts', description: 'A toast when something is wrong: a sensor goes silent, ingest stalls.', icon: BellAlertIcon, keywords: 'notification popup live' },
  { id: 'liveToastSeconds', panel: 'time', title: 'At most one toast every', description: 'So a flapping sensor does not flood the corner of the screen.', icon: ClockIcon, keywords: 'throttle interval' },
  { id: 'notifySeverity', panel: 'time', title: 'Notify from', description: 'Alerts at or above this severity notify you.', icon: BellAlertIcon, keywords: 'notification threshold critical high' },
  { id: 'notifyDesktop', panel: 'time', title: 'Desktop notifications', description: 'Through the browser, while the dashboard is open.', icon: BellIcon, keywords: 'notification browser' },
  { id: 'notifySound', panel: 'time', title: 'Sound', description: 'A short sound with each notification.', icon: SpeakerWaveIcon, keywords: 'audio notification' },
  { id: 'notifyCanary', panel: 'time', title: 'Canarytoken fires', description: 'A notification when a planted token phones home.', icon: BellIcon, keywords: 'notification canary' },
  { id: 'defaultWindow', panel: 'map', title: 'Default window', description: 'The time range an investigation opens with.', icon: CalendarDaysIcon, keywords: 'range time investigation' },
  { id: 'mapBasemap', panel: 'map', title: 'Basemap', description: 'The tiles under the attack map.', icon: MapIcon, keywords: 'map tiles openstreetmap' },
  { id: 'mapClustering', panel: 'map', title: 'Cluster markers', description: 'Group nearby origins into one marker until you zoom in.', icon: MapIcon, keywords: 'map cluster' },
  { id: 'mapAnimation', panel: 'map', title: 'Map animation', description: 'Animate new origins as they arrive.', icon: SparklesIcon, keywords: 'map motion' },
  { id: 'appName', panel: 'branding', title: 'Application name', description: 'Shown in the top bar and page titles. Required.', icon: TagIcon, keywords: 'brand title product' },
  { id: 'productLabel', panel: 'branding', title: 'Product label', description: 'The line under the application name.', icon: TagIcon, keywords: 'subtitle brand' },
  { id: 'orgName', panel: 'branding', title: 'Organization', description: 'Who runs this deployment.', icon: UsersIcon, keywords: 'company team' },
  { id: 'dashboardTitle', panel: 'branding', title: 'Overview title', description: 'The heading of the overview page.', icon: HomeIcon, keywords: 'heading overview' },
  { id: 'dashboardSubtitle', panel: 'branding', title: 'Overview subtitle', description: 'The line under it.', icon: HomeIcon, keywords: 'subheading overview' },
  { id: 'overviewIntro', panel: 'branding', title: 'Overview intro', description: 'A short welcome above the overview.', icon: DocumentTextIcon, keywords: 'welcome text' },
  { id: 'bannerText', panel: 'branding', title: 'Banner', description: 'A notice every user sees until it expires or you clear it.', icon: MegaphoneIcon, keywords: 'announcement maintenance incident notice' },
  { id: 'bannerSeverity', panel: 'branding', title: 'Banner severity', description: 'How loud the banner is.', icon: MegaphoneIcon, keywords: 'info warning danger success' },
  { id: 'bannerExpires', panel: 'branding', title: 'Banner expires', description: 'An RFC 3339 time, or empty to keep it until cleared.', icon: CalendarDaysIcon, keywords: 'expiry end' },
  { id: 'helpLinkLabel', panel: 'branding', title: 'Help link label', description: 'The text of the help link.', icon: LinkIcon, keywords: 'docs runbook' },
  { id: 'helpUrl', panel: 'branding', title: 'Help link', description: 'An https link to your runbook.', icon: LinkIcon, keywords: 'docs runbook url' },
  { id: 'footer', panel: 'branding', title: 'Footer', description: 'Printed at the bottom of every page.', icon: Bars3BottomLeftIcon },
  { id: 'aiDisclaimer', panel: 'branding', title: 'AI disclaimer', description: 'Shown with model-generated analysis.', icon: SparklesIcon, keywords: 'llm model generated' },
  { id: 'privacyNotice', panel: 'branding', title: 'Privacy notice', description: 'Shown where captured traffic may hold personal data.', icon: ShieldCheckIcon, keywords: 'gdpr evidence handling' },
  { id: 'defaultLanding', panel: 'behavior', title: 'Default landing page', description: 'For users who have not picked their own.', icon: HomeIcon, keywords: 'start page' },
  { id: 'defaultTimeWindow', panel: 'behavior', title: 'Default time window', description: 'The range pages open with.', icon: CalendarDaysIcon, keywords: 'range' },
  { id: 'defaultTimezone', panel: 'behavior', title: 'Default time zone', description: 'For users who have not picked their own.', icon: GlobeAltIcon, keywords: 'iana utc' },
  { id: 'rowsPerPageOptions', panel: 'behavior', title: 'Rows per page choices', description: 'What users can pick from.', icon: QueueListIcon, keywords: 'pagination sizes' },
  { id: 'refreshIntervalOptions', panel: 'behavior', title: 'Refresh interval choices', description: 'What users can pick from.', icon: ArrowPathIcon, keywords: 'polling seconds' },
  { id: 'maxExportRows', panel: 'behavior', title: 'Export cap', description: 'The most rows one CSV or JSON export may carry.', icon: ArrowTopRightOnSquareIcon, keywords: 'limit csv json download' },
  { id: 'sourceStaleMinutes', panel: 'behavior', title: 'Stale after', description: 'A sensor feed with nothing newer is flagged stale.', icon: ClockIcon, keywords: 'source health threshold' },
  { id: 'mapProvider', panel: 'behavior', title: 'Map provider', description: 'The tile source behind every map.', icon: MapIcon, keywords: 'basemap openstreetmap' },
  { id: 'showMlPanels', panel: 'behavior', title: 'ML panels', description: 'Machine-learning scores on overview and detail pages.', icon: CpuChipIcon, keywords: 'machine learning anomalies experimental' },
  { id: 'showProblemReportButton', panel: 'behavior', title: 'Report a problem button', description: 'The floating button that captures what led up to a problem.', icon: MegaphoneIcon, keywords: 'feedback bug' },
  { id: 'maintenanceMode', panel: 'behavior', title: 'Maintenance mode', description: 'Tells every user the platform is being worked on.', icon: AdjustmentsHorizontalIcon, keywords: 'banner downtime' },
  { id: 'readOnly', panel: 'behavior', title: 'Read only', description: 'Freezes every write for everyone, admins included.', icon: NoSymbolIcon, keywords: 'freeze lock' },
  { id: 'reporter', panel: 'honeypot', title: 'Report sender', description: 'What the abuse-report sender attempted and sent, by its own counters.', icon: EnvelopeIcon, keywords: 'abuseipdb reporter sent suppressed dry run failed cooldown' },
  { id: 'alertCooldown', panel: 'honeypot', title: 'Alert cooldown', description: 'How long before the same alert notifies again, e.g. 30m or 2h (5m to 168h).', icon: BellIcon, keywords: 'throttle duration' },
  { id: 'alertCampaignScore', panel: 'honeypot', title: 'Campaign alert score', description: 'A correlated campaign at or above this score alerts (0–100).', icon: BellAlertIcon, keywords: 'threshold correlation' },
  { id: 'sandboxAlertRiskScore', panel: 'honeypot', title: 'Sandbox alert risk', description: 'A detonation at or above this risk alerts (0–100).', icon: CpuChipIcon, keywords: 'threshold detonation' },
  { id: 'mlAlertThreshold', panel: 'honeypot', title: 'ML alert threshold', description: 'An anomaly score at or above this alerts (0–1).', icon: SparklesIcon, keywords: 'machine learning anomaly' },
  { id: 'yaraScanIntervalSeconds', panel: 'honeypot', title: 'YARA scan interval', description: 'How often new payloads are scanned.', icon: ArrowPathIcon, keywords: 'scanner rules' },
  { id: 'yaraMaxBytes', panel: 'honeypot', title: 'YARA size cap', description: 'Larger payloads are skipped (1 MiB to 1 GiB).', icon: ArchiveBoxXMarkIcon, keywords: 'scanner limit bytes' },
  { id: 'payloadDedupeIntervalSeconds', panel: 'honeypot', title: 'Payload dedupe interval', description: 'How often duplicate captures are folded together.', icon: ArrowPathIcon, keywords: 'dedupe' },
  { id: 'users', panel: 'users', title: 'Dashboard users', description: 'Who signed in, with roles and last activity.', icon: UsersIcon, keywords: 'accounts' },
  { id: 'services', panel: 'services', title: 'Containers', description: 'Start, stop or restart a sensor or worker.', icon: ServerStackIcon, keywords: 'docker restart stop start' },
  { id: 'presetName', panel: 'report-presets', title: 'Name', description: 'Leave empty to keep the built-in name.', icon: DocumentTextIcon, keywords: 'report template preset override' },
  { id: 'presetDescription', panel: 'report-presets', title: 'Description', description: 'Leave empty to keep the built-in description.', icon: DocumentTextIcon, keywords: 'report template preset override' },
  { id: 'canary', panel: 'canarytokens', title: 'Canarytokens', description: 'Create and review planted tokens.', icon: StarIcon, keywords: 'honeytoken' },
  { id: 'clusterStatus', panel: 'elasticsearch', title: 'Cluster health', description: 'Yellow means a replica has nowhere to go; red means data is unavailable.', icon: ServerStackIcon, keywords: 'elasticsearch green yellow red' },
  { id: 'storageTotals', panel: 'elasticsearch', title: 'Stored', description: 'Every index on the cluster.', icon: ArchiveBoxXMarkIcon, keywords: 'size disk shards indices documents' },
  { id: 'storageFamilies', panel: 'elasticsearch', title: 'Where the space goes', description: 'The biggest index families.', icon: TableCellsIcon, keywords: 'indices size dead letter' },
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
