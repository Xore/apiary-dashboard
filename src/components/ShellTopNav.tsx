import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs'
import { LiveBadge } from './LiveBadge'
import { MockScenarioMenu } from './MockScenarioMenu'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Kbd } from '@astryxdesign/core/Kbd'
import { NavIcon } from '@astryxdesign/core/NavIcon'
import { HStack, StackItem } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav'
import { MagnifyingGlassIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { navItemFor, pageFor, sectionFor } from '#/lib/nav'
import { TOP_NAV_END_ID, ViewTabsBar, ViewTabsMenu, useViewTabs } from './ViewTabs'
import { useAppShellMobile } from '@astryxdesign/core/AppShell'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { Selector } from '@astryxdesign/core/Selector'
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { DEFAULT_RANGE, RANGES, isRange } from '#/lib/range'
import type { RangeId } from '#/lib/range'
import type { ShellConfig } from '#/data/types'

/** Phones get a second row for the page's views and the time range. */
export const PHONE_QUERY = '(max-width: 639px)'

/** The app-wide time range; every page reads it from ?range=. Compact
 * shows the short names (24h, 7d). */
export function RangePicker({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const raw = useSearch({ strict: false, select: (search: Record<string, unknown>) => search.range })
  const range: RangeId = isRange(raw) ? raw : DEFAULT_RANGE
  return (
    <Selector
      label="Time range"
      isLabelHidden
      size="sm"
      value={range}
      onChange={(value) =>
        void navigate({ to: '.', search: (prev: Record<string, unknown>) => ({ ...prev, range: value === DEFAULT_RANGE || !isRange(value) ? undefined : value }) })
      }
      options={RANGES.map((r) => ({ value: r.id, label: compact ? r.id : r.label }))}
    />
  )
}

function ShellBreadcrumbs() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const section = sectionFor(pathname)
  const parent = navItemFor(pathname)
  const page = pageFor(pathname)
  const isDrillDown = parent !== undefined && parent.to !== pathname

  return (
    <Breadcrumbs variant="supporting" label="Current page">
      {section && <BreadcrumbItem isCurrent={false}>{section}</BreadcrumbItem>}
      {isDrillDown && <BreadcrumbItem href={parent.to}>{parent.label}</BreadcrumbItem>}
      <BreadcrumbItem isCurrent>{page}</BreadcrumbItem>
    </Breadcrumbs>
  )
}

export function ShellTopNav({ config, onOpenPalette }: { config: ShellConfig; onOpenPalette: () => void }) {
  // A page with tabs gives the bar to them: the sidebar already says where
  // you are, and the tabs say which view.
  const hasTabs = useViewTabs() !== null
  // In the drawer layout the tabs become one Views menu and the controls
  // their icons; on a phone the views and range move to a row of their own.
  const { isMobile } = useAppShellMobile()
  const isPhone = useMediaQuery(PHONE_QUERY)
  return (
    <TopNav
      label="Page header"
      heading={
        <TopNavHeading
          logo={<NavIcon icon={<Icon icon={ShieldCheckIcon} size="sm" />} />}
          heading={config.presentation.appName}
          subheading={isMobile ? undefined : config.presentation.productLabel}
          headingHref="/"
        />
      }
      startContent={
        isMobile ? undefined : (
        <HStack gap={4} vAlign="center" className="apiary-desktop-start">
          {!hasTabs && <ShellBreadcrumbs />}
          {/* TopNav sizes its start slot to content, so the tabs get a fixed
              budget: what the heading, breadcrumbs, and end controls leave.
              Tabs past it go into a More menu. */}
          <StackItem size="fill" style={{ width: hasTabs ? 'max(240px, calc(100vw - 730px))' : 'max(240px, calc(100vw - 860px))' }}>
            <ViewTabsBar />
          </StackItem>
        </HStack>
        )
      }
      endContent={
        // The tab strip measures up to here, so tabs never run under it.
        <HStack id={TOP_NAV_END_ID} gap={2} vAlign="center">
          {isMobile && !isPhone && <ViewTabsMenu />}
          {!isPhone && <RangePicker compact={isMobile} />}
          {isMobile ? (
            <Button label="Search" variant="secondary" size="sm" isIconOnly tooltip="Search (⌘K)" icon={<Icon icon={MagnifyingGlassIcon} size="sm" />} onClick={onOpenPalette} />
          ) : (
            <Button label="Search" variant="secondary" size="sm" icon={<Icon icon={MagnifyingGlassIcon} size="sm" />} onClick={onOpenPalette}>
              <HStack gap={2} vAlign="center">
                <Text>Search</Text>
                <Kbd keys="⌘K" />
              </HStack>
            </Button>
          )}
          <MockScenarioMenu compact={isMobile} />
          <LiveBadge compact={isPhone} />
        </HStack>
      }
    />
  )
}

/** A phone's second row: the page's views and the time range, under the
 * top bar where there is room for them. */
export function PhoneViewBar() {
  const isPhone = useMediaQuery(PHONE_QUERY)
  if (!isPhone) return null
  return (
    <HStack gap={2} vAlign="center" hAlign="between" style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border-default, transparent)' }}>
      <ViewTabsMenu />
      <StackItem size="fill" />
      <RangePicker compact />
    </HStack>
  )
}
