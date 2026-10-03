import { createContext } from 'react'
import type { ReactNode } from 'react'
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs'
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { useLocation } from '@tanstack/react-router'
import { navItemFor, pageFor, sectionFor } from '#/lib/nav'
import { Pending } from './Pending'

type PageFrameProps = {
  title: ReactNode
  description?: string
  /** Above the title: what kind of thing this is ("Source IP"). */
  label?: string
  /** Identity tokens beside the title (country, severity, tags…). */
  tokens?: ReactNode
  actions?: ReactNode
  /** Key facts in one scannable strip; a value still loading (undefined)
   * is a skeleton. */
  facts?: Array<{ label: string; value: ReactNode | undefined }>
  /** The page's filters: pinned under the title while the work scrolls (on
   * a phone they scroll with it, so they never take the screen). */
  toolbar?: ReactNode
  /** Where this page sits and the way back up. Defaults to the trail the
   * navigation gives this address; detail pages add their list stepper. */
  trail?: ReactNode
  /** Caps the work's width (a single-column form); the header and its left
   * edge stay where every other page has them. */
  contentWidth?: number
  children: ReactNode
}

/** Set by a detail page's frame: its panels are sections of one record, not
 * widgets, so they drop the card (see DashboardBlocks' Panel). */
export const DetailContext = createContext(false)

/** The way up: the page's section, its parent list when this is a page
 * opened from one, and anything the page adds at the end (a list stepper).
 * Every page has one (a page outside the sections names only itself), so
 * the title sits at the same height on every page.
 * `parent` overrides it: back to the list this page was opened from, with
 * its filters, under that list's own title. */
export function PageTrail({ parent: from, end }: { parent?: { href: string; title: string }; end?: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const section = sectionFor(pathname)
  const parent = navItemFor(pathname)
  const isDrillDown = parent !== undefined && parent.to !== pathname
  return (
    // One height, whether the trail has one crumb or a stepper.
    <HStack gap={3} vAlign="center" wrap="wrap" minHeight={28}>
      <Breadcrumbs variant="supporting" label="You are here">
        {section && <BreadcrumbItem isCurrent={false}>{section}</BreadcrumbItem>}
        {from ? <BreadcrumbItem href={from.href}>{from.title}</BreadcrumbItem> : isDrillDown && <BreadcrumbItem href={parent.to}>{parent.label}</BreadcrumbItem>}
        <BreadcrumbItem isCurrent>{pageFor(pathname)}</BreadcrumbItem>
      </Breadcrumbs>
      {end}
    </HStack>
  )
}

/** The one page frame: trail, title row, description, key facts and
 * filters pinned at the top; the work scrolls under them, full width
 * unless a form caps it. Every page renders through it, so the title, the
 * way back and the actions are in the same place on every page. */
export function PageFrame({ title, description, label, tokens, actions, facts, toolbar, trail, contentWidth, children }: PageFrameProps) {
  return (
    <Layout
      height="fill"
      padding={6}
      // The work scrolls under the pinned header: a full-bleed line fences it.
      defaultHasDividers
      header={
        <LayoutHeader>
          <VStack gap={3}>
            {trail ?? <PageTrail />}
            <HStack hAlign="between" vAlign="start" gap={4} wrap="wrap">
              <VStack gap={1}>
                {label && (
                  <Text type="label" color="secondary">
                    {label}
                  </Text>
                )}
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Heading level={1}>{title}</Heading>
                  {tokens}
                </HStack>
                {description && <Text color="secondary">{description}</Text>}
              </VStack>
              {actions && (
                <HStack gap={2} vAlign="center" wrap="wrap">
                  {actions}
                </HStack>
              )}
            </HStack>
            {facts && facts.length > 0 && (
              <MetadataList orientation="horizontal" columns="multi">
                {facts.map((fact) => (
                  <MetadataListItem key={fact.label} label={fact.label}>
                    <Pending>{fact.value}</Pending>
                  </MetadataListItem>
                ))}
              </MetadataList>
            )}
            {toolbar && <div className="apiary-not-phone">{toolbar}</div>}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={5}>
            {toolbar && <div className="apiary-phone-only">{toolbar}</div>}
            {contentWidth ? <VStack maxWidth={contentWidth}>{children}</VStack> : children}
          </VStack>
        </LayoutContent>
      }
    />
  )
}

