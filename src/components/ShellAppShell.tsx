import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { AppShell } from '@astryxdesign/core/AppShell'
import { CommandPalette } from '@astryxdesign/core/CommandPalette'
import { ToastViewport } from '@astryxdesign/core/Toast'
import type { SessionUser, ShellConfig } from '#/data/types'
import { NAV_SECTIONS } from '#/lib/nav'
import { paletteSource } from '#/lib/paletteSource'
import type { PaletteItem } from '#/lib/paletteSource'
import { usePredictivePrefetch } from '#/lib/prefetch'
import { usePreferences } from '#/lib/prefs'
import { recordRecentFromLocation } from '#/lib/recent'
import { EventNotifications } from './EventNotifications'
import { LiveToasts } from './LiveToasts'
import { ProblemReportButton } from './ProblemReportButton'
import { SettingsDialog } from './SettingsDialog'
import type { PaneId } from './SettingsDialog'
import { ShellBanners, ShellFloatingActions } from './ShellNotices'
import { ShellSideNav } from './ShellSideNav'
import { PhoneViewBar, ShellTopNav } from './ShellTopNav'
import { rememberViewportWidth } from '#/lib/viewport'

// Pages without a sidebar entry stay reachable from the palette.
const UNLISTED = [
  { id: '/search', label: 'Search everything' },
  { id: '/settings', label: 'Settings' },
  { id: '/dead-letters', label: 'Ingest dead letters' },
  { id: '/problem-reports', label: 'Problem reports' },
]

const PAGES: PaletteItem[] = [
  ...NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      id: item.to,
      label: item.label,
      auxiliaryData: { group: section.label, href: item.to },
    })),
  ),
  ...UNLISTED.map((page) => ({ ...page, auxiliaryData: { group: 'More', href: page.id } })),
]

/** Whether a key press belongs to a field the operator is typing in. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.closest('[role="combobox"],[role="textbox"]') !== null
}

/** The single application shell: one topbar, one sidebar, one content
 * region, and the global command palette. */
type ShellProps = {
  user: SessionUser
  config: ShellConfig
  /** Whether the first render is the narrow (drawer) layout: what the
   * server knew of this browser's width, so it renders the same. */
  narrow?: boolean
  /** The open settings pane, if the settings modal is showing. */
  settingsPane?: PaneId
  onSettingsPane: (pane: PaneId | undefined) => void
}

export function ShellAppShell({ user, config, narrow = false, settingsPane, onSettingsPane }: ShellProps) {
  const navigate = useNavigate()
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const searchSource = useMemo(() => paletteSource(PAGES), [])
  const location = useLocation()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen(true)
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault()
        setIsPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => rememberViewportWidth(), [])
  useEffect(() => recordRecentFromLocation(location.pathname, location.searchStr), [location.pathname, location.searchStr])
  usePredictivePrefetch()

  const prefs = usePreferences()
  const timeKey = prefs ? `${prefs.timezone}|${prefs.clock}|${prefs.timestamps}` : undefined

  return (
    // Toasts top right, under the top bar: the bottom corners belong to the
    // account menu and the report-a-problem button.
    <ToastViewport position="topEnd" inset={{ top: 64, end: 16 }} maxVisible={4}>
      <AppShell
        contentPadding={0}
        // Tablets get the drawer too: a 260 px sidebar leaves them too little.
        mobileNav={{ breakpoint: 'lg', defaultIsMobile: narrow }}
        topNav={<ShellTopNav config={config} onOpenPalette={() => setIsPaletteOpen(true)} />}
        sideNav={<ShellSideNav user={user} config={config} onOpenSettings={() => onSettingsPane('account')} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <PhoneViewBar />
          <ShellBanners config={config} />
          {/* Times are formatted from module state, so a change to how they
              read remounts the page; dialogs in the shell stay open. */}
          {/* Room at the bottom, so the floating actions never hide a
              page's last row for good. */}
          <div key={timeKey} style={{ flex: 1, minHeight: 0, paddingBlockEnd: 64 }}>
            <Outlet />
          </div>

        </div>
      </AppShell>
      <CommandPalette
        isOpen={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        searchSource={searchSource}
        label="Go to a page, or search IPs, sessions, payloads…"
        onValueChange={(id) => {
          setIsPaletteOpen(false)
          // Pages are their own ids; an entity carries its target.
          const to = id.startsWith('/') ? id : searchSource.lastHref(id)
          if (!to) return
          // Settings opens as a modal over the current page.
          if (to === '/settings') onSettingsPane('account')
          else void navigate({ to })
        }}
      />
      <ShellFloatingActions config={config} problemReport={<ProblemReportButton enabled={config.behavior.showProblemReportButton} />} />
      <LiveToasts />
      <EventNotifications />
      {settingsPane && <SettingsDialog pane={settingsPane} onPane={onSettingsPane} onClose={() => onSettingsPane(undefined)} />}
    </ToastViewport>
  )
}
