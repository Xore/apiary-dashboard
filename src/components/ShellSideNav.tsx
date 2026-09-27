import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu'
import { Icon } from '@astryxdesign/core/Icon'
import {
  SideNav,
  SideNavItem,
  SideNavSection,
  useSideNavCollapse,
} from '@astryxdesign/core/SideNav'
import {
  ArrowRightStartOnRectangleIcon,
  ClockIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { useLocation } from '@tanstack/react-router'
import { getOpenAlertCount } from '#/data/queries'
import type { SessionUser, ShellConfig } from '#/data/types'
import { useLiveInterval } from '#/lib/live'
import { NAV_SECTIONS, navHrefFor } from '#/lib/nav'
import { usePreferences } from '#/lib/prefs'
import { hrefForRecent, labelForRecent, useRecentInvestigations } from '#/lib/recent'

/** Open alerts, as the canonical bell counts them: every minute while live
 * is on, and after each navigation (acknowledging on /alerts lowers it). */
function useOpenAlertCount(pathname: string): number | null {
  const [count, setCount] = useState<number | null>(null)
  const refresh = useCallback(() => {
    getOpenAlertCount().then(setCount, () => setCount(null))
  }, [])
  useLiveInterval(refresh, 60_000)
  useEffect(refresh, [refresh, pathname])
  return count
}

function AccountMenu({ user, onOpenSettings }: { user: SessionUser; onOpenSettings: () => void }) {
  // A collapsed sidebar has room for the icon only; the name stays the label.
  const { isCollapsed } = useSideNavCollapse()

  return (
    <DropdownMenu
      placement="above"
      button={{
        label: user.name,
        icon: <Icon icon={UserCircleIcon} size="sm" />,
        variant: 'ghost',
        ...(isCollapsed ? { isIconOnly: true } : { width: '100%' }),
      }}
    >
      <DropdownMenuItem
        label="Settings"
        icon={Cog6ToothIcon}
        onClick={onOpenSettings}
      />
      <DropdownMenuItem label="Sign out" icon={ArrowRightStartOnRectangleIcon} onClick={() => window.location.assign('/auth/logout')} />
    </DropdownMenu>
  )
}

export function ShellSideNav({ user, config, onOpenSettings }: { user: SessionUser; config: ShellConfig; onOpenSettings: () => void }) {
  const prefs = usePreferences()
  const pathname = useLocation({ select: (location) => location.pathname })
  const activeHref = navHrefFor(pathname)
  const openAlerts = useOpenAlertCount(pathname)
  const recent = useRecentInvestigations()

  return (
    <SideNav
      collapsible={{ defaultIsCollapsed: prefs?.collapsedSidebar ?? false }}
      resizable={{ defaultWidth: 260, minWidth: 220, maxWidth: 360 }}
      footer={
        <SideNavSection title="Account" isHeaderHidden>
          <AccountMenu user={user} onOpenSettings={onOpenSettings} />
        </SideNavSection>
      }
    >
      {NAV_SECTIONS.map((section) => (
        <SideNavSection key={section.label} title={section.label}>
          {/* ML pages hide with the ML panels switch. */}
          {section.items.filter((item) => config.behavior.showMlPanels || item.to !== '/ml-anomalies').map((item) => (
            <SideNavItem
              key={item.to}
              label={item.label}
              icon={item.icon}
              href={item.to}
              isSelected={item.to === activeHref}
              endContent={item.to === '/alerts' && openAlerts ? <Badge variant="warning" label={openAlerts > 99 ? '99+' : openAlerts} aria-label={`, ${openAlerts} open`} /> : undefined}
            />
          ))}
        </SideNavSection>
      ))}
      {recent.length > 0 && (
        <SideNavSection title="Recent">
          {recent.map((entry) => (
            <SideNavItem key={`${entry.kind}:${entry.value}`} label={labelForRecent(entry)} icon={ClockIcon} href={hrefForRecent(entry)!} />
          ))}
        </SideNavSection>
      )}
    </SideNav>
  )
}
