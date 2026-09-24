import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { basePathOf, readListContext } from '#/lib/listContext'
import type { ListContext } from '#/lib/listContext'
import { formatNumber } from '#/lib/format'
import { useViewTabs } from './ViewTabs'

function safeDecode(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export type EntityTab = {
  /** Path segment under the entity's base path; the first tab is the index. */
  id: string
  label: string
  /** Shown in the tab label, e.g. "Sessions (6)". */
  count?: number
}

type EntityFrameProps = {
  /** e.g. "Source IP" — the kind, shown above the title. */
  kind: string
  title: ReactNode
  description?: string
  /** Identity tokens next to the title (country, severity, tags…). */
  tokens?: ReactNode
  /** Key facts in one scannable strip. */
  facts?: Array<{ label: string; value: ReactNode }>
  actions?: ReactNode
  /** The entity's base path, e.g. /sources/198.51.100.13 (encoded). */
  basePath: string
  tabs: EntityTab[]
  /** The active tab's content (the child route's Outlet). */
  children: ReactNode
}

/** Prev/next through the list this entity was opened from (J/K), plus a way
 * back to that list with its filters. */
function ListStepper({ basePath, tab }: { basePath: string; tab: string }) {
  const navigate = useNavigate()
  const [context, setContext] = useState<ListContext | null>(null)
  useEffect(() => setContext(readListContext()), [basePath])
  const index = context ? context.hrefs.findIndex((href) => basePathOf(href, basePath)) : -1
  // Stepping keeps the tab you are on, so you can compare e.g. raw records.
  const onTab = (href: string | undefined) => {
    if (!href || !tab) return href
    const [path, query] = href.split('?')
    return `${path}/${tab}${query ? `?${query}` : ''}`
  }
  const prev = onTab(context && index > 0 ? context.hrefs[index - 1] : undefined)
  const next = onTab(context && index >= 0 && index < context.hrefs.length - 1 ? context.hrefs[index + 1] : undefined)

  useEffect(() => {
    if (index < 0) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'j' && next) void navigate({ href: next })
      if (event.key === 'k' && prev) void navigate({ href: prev })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, next, prev, navigate])

  if (!context || index < 0) return null
  return (
    <HStack gap={2} vAlign="center">
      <Link href={context.listHref}>{`Back to ${context.listTitle}`}</Link>
      <Text type="supporting">
        {formatNumber(index + 1)} of {formatNumber(context.hrefs.length)}
      </Text>
      <Button
        label="Previous (K)"
        isIconOnly
        size="sm"
        variant="secondary"
        icon={<Icon icon={ChevronLeftIcon} size="sm" />}
        isDisabled={!prev}
        onClick={() => prev && void navigate({ href: prev })}
      />
      <Button
        label="Next (J)"
        isIconOnly
        size="sm"
        variant="secondary"
        icon={<Icon icon={ChevronRightIcon} size="sm" />}
        isDisabled={!next}
        onClick={() => next && void navigate({ href: next })}
      />
    </HStack>
  )
}

/** The frame every entity page shares (epic #25): identity header, key-fact
 * strip, actions, and tabs as route segments shown in the top bar. */
export function EntityFrame({ kind, title, description, tokens, facts, actions, basePath, tabs, children }: EntityFrameProps) {
  const navigate = useNavigate()
  // The router may hand back a partly decoded pathname, so compare both sides decoded.
  const pathname = safeDecode(useLocation({ select: (location) => location.pathname }))
  const base = safeDecode(basePath)
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '') : ''
  const active = tabs.find((tab) => tab.id === rest.split('/')[0])?.id ?? tabs[0].id

  useViewTabs({
    label: `${kind} views`,
    tabs: tabs.map((tab) => ({ id: tab.id, label: tab.count === undefined ? tab.label : `${tab.label} (${formatNumber(tab.count)})` })),
    value: active,
    onChange: (id) => void navigate({ href: id === tabs[0].id ? basePath : `${basePath}/${id}` }),
  })

  return (
    <Layout
      height="fill"
      padding={6}
      header={
        <LayoutHeader>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="start" gap={4} wrap="wrap">
              <VStack gap={1}>
                <Text type="label" color="secondary">
                  {kind}
                </Text>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Heading level={1}>{title}</Heading>
                  {tokens}
                </HStack>
                {description && <Text color="secondary">{description}</Text>}
              </VStack>
              <VStack gap={2} hAlign="end">
                {actions && (
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    {actions}
                  </HStack>
                )}
                <ListStepper basePath={basePath} tab={active === tabs[0].id ? '' : active} />
              </VStack>
            </HStack>
            {facts && facts.length > 0 && (
              <MetadataList orientation="horizontal" columns="multi">
                {facts.map((fact) => (
                  <MetadataListItem key={fact.label} label={fact.label}>
                    {fact.value}
                  </MetadataListItem>
                ))}
              </MetadataList>
            )}
          </VStack>
        </LayoutHeader>
      }
      content={<LayoutContent>{children}</LayoutContent>}
    />
  )
}
