import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { HStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { basePathOf, readListContext } from '#/lib/listContext'
import type { ListContext } from '#/lib/listContext'
import { formatNumber } from '#/lib/format'
import { getPins, getServerPins, subscribe, togglePin } from '#/lib/watchlist'
import { DetailContext, PageFrame, PageTrail } from './PageFrame'

function safeDecode(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

type EntityFrameProps = {
  /** e.g. "Source IP" — the kind, shown above the title. */
  kind: string
  title: ReactNode
  description?: string
  /** Identity tokens next to the title (country, severity, tags…). */
  tokens?: ReactNode
  /** Key facts in one scannable strip; a value still loading (undefined)
   * is a skeleton. */
  facts?: Array<{ label: string; value: ReactNode | undefined }>
  actions?: ReactNode
  /** The entity's base path, e.g. /sources/198.51.100.13 (encoded). Its tabs
   * are declared on the route (`entityTabs` in ViewTabs). */
  basePath: string
  /** The active tab's content (the child route's Outlet). */
  children: ReactNode
}

/** The list this entity was opened from, where it sits in it, and its
 * neighbours (keeping the tab you are on, so e.g. raw records compare). */
function useListPosition(basePath: string, tab: string) {
  const [context, setContext] = useState<ListContext | null>(null)
  useEffect(() => setContext(readListContext()), [basePath])
  const index = context ? context.hrefs.findIndex((href) => basePathOf(href, basePath)) : -1
  const onTab = (href: string | undefined) => {
    if (!href || !tab) return href
    const [path, query] = href.split('?')
    return `${path}/${tab}${query ? `?${query}` : ''}`
  }
  const prev = onTab(context && index > 0 ? context.hrefs[index - 1] : undefined)
  const next = onTab(context && index >= 0 && index < context.hrefs.length - 1 ? context.hrefs[index + 1] : undefined)
  return index < 0 || !context ? null : { context, index, prev, next }
}

/** Prev/next through that list (J/K), in the page's trail after the way
 * back to it. */
function ListStepper({ position }: { position: NonNullable<ReturnType<typeof useListPosition>> }) {
  const navigate = useNavigate()
  const { context, index, prev, next } = position
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'j' && next) void navigate({ href: next })
      if (event.key === 'k' && prev) void navigate({ href: prev })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, navigate])
  return (
    <HStack gap={1} vAlign="center">
      <Button label="Previous (K)" isIconOnly size="sm" variant="ghost" icon={<Icon icon={ChevronLeftIcon} size="sm" />} isDisabled={!prev} onClick={() => prev && void navigate({ href: prev })} />
      <Text type="supporting">
        {formatNumber(index + 1)} of {formatNumber(context.hrefs.length)}
      </Text>
      <Button label="Next (J)" isIconOnly size="sm" variant="ghost" icon={<Icon icon={ChevronRightIcon} size="sm" />} isDisabled={!next} onClick={() => next && void navigate({ href: next })} />
    </HStack>
  )
}

/** Pin this entity to the watchlist, or unpin it. */
function PinButton({ href, kind, title }: { href: string; kind: string; title: string }) {
  const pins = useSyncExternalStore(subscribe, getPins, getServerPins)
  const pinned = pins.some((p) => p.href === href)
  return (
    <Button
      label={pinned ? 'Unpin from watchlist' : 'Pin to watchlist'}
      isIconOnly
      size="sm"
      variant="secondary"
      icon={<Icon icon={pinned ? BookmarkSolidIcon : BookmarkIcon} size="sm" />}
      onClick={() => togglePin({ href, kind, title })}
    />
  )
}

/** The frame every entity page shares (epic #25): the page frame with the
 * entity's kind, identity tokens, key-fact strip and actions; the trail
 * goes back to the list it was opened from (with its filters) and steps
 * through it. Tabs are route segments shown in the top bar. Its panels are
 * sections of one record, not cards. */
export function EntityFrame({ kind, title, description, tokens, facts, actions, basePath, children }: EntityFrameProps) {
  // The router may hand back a partly decoded pathname, so compare both sides decoded.
  const pathname = safeDecode(useLocation({ select: (location) => location.pathname }))
  const base = safeDecode(basePath)
  const tab = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1).split('/')[0] : ''
  const position = useListPosition(basePath, tab)

  return (
    // The trail ends with the entity's kind, so no label repeats it.
    <PageFrame
      title={title}
      description={description}
      tokens={tokens}
      facts={facts}
      actions={
        <>
          {actions}
          <PinButton href={basePath} kind={kind} title={typeof title === 'string' ? title : safeDecode(basePath.split('/').pop() ?? basePath)} />
        </>
      }
      trail={<PageTrail parent={position ? { href: position.context.listHref, title: position.context.listTitle } : undefined} end={position && <ListStepper position={position} />} />}
    >
      <DetailContext.Provider value>{children}</DetailContext.Provider>
    </PageFrame>
  )
}
