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
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { useLocation } from '@tanstack/react-router'
import type { SessionUser, ShellConfig } from '#/data/types'
import { NAV_SECTIONS, navHrefFor } from '#/lib/nav'
import { usePreferences } from '#/lib/prefs'

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
      {/* Sign-out is wired to /auth/logout with the auth work (#5). */}
      <DropdownMenuItem label="Sign out" icon={ArrowRightStartOnRectangleIcon} onClick={() => {}} />
    </DropdownMenu>
  )
}

export function ShellSideNav({ user, config, onOpenSettings }: { user: SessionUser; config: ShellConfig; onOpenSettings: () => void }) {
  const prefs = usePreferences()
  const pathname = useLocation({ select: (location) => location.pathname })
  const activeHref = navHrefFor(pathname)

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
            />
          ))}
        </SideNavSection>
      ))}
    </SideNav>
  )
}
