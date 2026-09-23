import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Kbd } from '@astryxdesign/core/Kbd'
import { HStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { TopNav } from '@astryxdesign/core/TopNav'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useLocation } from '@tanstack/react-router'
import { navItemFor, pageFor, sectionFor } from '#/lib/nav'
import { ViewTabsBar } from './ViewTabs'

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

export function ShellTopNav({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <TopNav
      label="Page header"
      startContent={
        <HStack gap={4} vAlign="center">
          <ShellBreadcrumbs />
          <ViewTabsBar />
        </HStack>
      }
      endContent={
        <>
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
          <Token label="Mock data" size="sm" color="orange" />
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant="success" label="Live feed connected" isPulsing />
            <Text type="supporting">Live</Text>
          </HStack>
        </>
      }
    />
  )
}
