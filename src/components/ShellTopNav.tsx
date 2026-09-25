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
import { TOP_NAV_END_ID, ViewTabsBar, useViewTabs } from './ViewTabs'
import { Selector } from '@astryxdesign/core/Selector'
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { DEFAULT_RANGE, RANGES, isRange } from '#/lib/range'
import type { RangeId } from '#/lib/range'
import type { ShellConfig } from '#/data/types'

/** The app-wide time range; every page reads it from ?range=. */
function RangePicker() {
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
      options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
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
  return (
    <TopNav
      label="Page header"
      heading={
        <TopNavHeading
          logo={<NavIcon icon={<Icon icon={ShieldCheckIcon} size="sm" />} />}
          heading={config.presentation.appName}
          subheading={config.presentation.productLabel}
          headingHref="/"
        />
      }
      startContent={
        <HStack gap={4} vAlign="center">
          {!hasTabs && <ShellBreadcrumbs />}
          {/* TopNav sizes its start slot to content, so the tabs get a fixed
              budget: what the heading, breadcrumbs, and end controls leave.
              Tabs past it go into a More menu. */}
          <StackItem size="fill" style={{ width: hasTabs ? 'max(240px, calc(100vw - 730px))' : 'max(240px, calc(100vw - 860px))' }}>
            <ViewTabsBar />
          </StackItem>
        </HStack>
      }
      endContent={
        // The tab strip measures up to here, so tabs never run under it.
        <HStack id={TOP_NAV_END_ID} gap={2} vAlign="center">
          <RangePicker />
          <Button
            label="Search"
            variant="secondary"
            size="sm"
            icon={<Icon icon={MagnifyingGlassIcon} size="sm" />}
            onClick={onOpenPalette}
          >
            <HStack gap={2} vAlign="center">
              <Text>Search</Text>
              <Kbd keys="⌘K" />
            </HStack>
          </Button>
          <MockScenarioMenu />
          <LiveBadge />
        </HStack>
      }
    />
  )
}
