import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { AppShell } from '@astryxdesign/core/AppShell'
import { CommandPalette } from '@astryxdesign/core/CommandPalette'
import { createStaticSource } from '@astryxdesign/core/Typeahead'
import type { SessionUser } from '#/data/types'
import { NAV_SECTIONS } from '#/lib/nav'
import { ShellSideNav } from './ShellSideNav'
import { ShellTopNav } from './ShellTopNav'

// Pages without a sidebar entry stay reachable from the palette.
const UNLISTED = [
  { id: '/search', label: 'Search everything' },
  { id: '/settings', label: 'Settings' },
  { id: '/dead-letters', label: 'Ingest dead letters' },
  { id: '/problem-reports', label: 'Problem reports' },
]

const PAGES = [
  ...NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      id: item.to,
      label: item.label,
      auxiliaryData: { group: section.label },
    })),
  ),
  ...UNLISTED.map((page) => ({ ...page, auxiliaryData: { group: 'More' } })),
]

/** The single application shell: one topbar, one sidebar, one content
 * region, and the global command palette. */
export function ShellAppShell({ user }: { user: SessionUser }) {
  const navigate = useNavigate()
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const searchSource = useMemo(() => createStaticSource(PAGES), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <AppShell
        contentPadding={0}
        topNav={<ShellTopNav onOpenPalette={() => setIsPaletteOpen(true)} />}
        sideNav={<ShellSideNav user={user} />}
      >
        <Outlet />
      </AppShell>
      <CommandPalette
        isOpen={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        searchSource={searchSource}
        label="Go to page"
        onValueChange={(to) => {
          setIsPaletteOpen(false)
          void navigate({ to })
        }}
      />
    </>
  )
}
