import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout'
import { Pagination } from '@astryxdesign/core/Pagination'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { InboxIcon } from '@heroicons/react/24/outline'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { formatNumber } from '#/lib/format'
import { saveListContext } from '#/lib/listContext'
import { useRowActivation } from './useRowActivation'
import { tableDensity, usePreferences } from '#/lib/prefs'

type RecordListProps<T extends Record<string, unknown>> = {
  title: string
  description?: string
  /** Header chips/actions to the right of the title. */
  actions?: ReactNode
  /** KPI tiles, notes, aggregation cards: everything above the table. */
  summary?: ReactNode
  /** Filter row directly above the table. */
  toolbar?: ReactNode
  rows: T[]
  columns: TableColumn<T>[]
  getId: (row: T) => string
  /** The row's entity page: a row opens it (epic #25). */
  getHref: (row: T) => string
  emptyState: { title: string; description: string }
  pageSize?: number
}

/** A store-backed record page: summary band, filter row, and a paged
 * full-width table whose rows open their entity page. */
export function RecordList<T extends Record<string, unknown>>({
  title,
  description,
  actions,
  summary,
  toolbar,
  rows,
  columns,
  getId,
  getHref,
  emptyState,
  pageSize: pageSizeProp,
}: RecordListProps<T>) {
  const prefs = usePreferences()
  const pageSize = pageSizeProp ?? prefs?.rowsPerPage ?? 25
  const navigate = useNavigate()
  const location = useLocation()
  const listHref = location.href
  // The page number is remembered per list address, so Back from an entity
  // page lands on the same page of the same filtered list.
  const pageKey = `apiary.page:${listHref}`
  const [page, setPageState] = useState(1)
  useEffect(() => {
    const saved = Number(sessionStorage.getItem(pageKey))
    setPageState(Number.isInteger(saved) && saved > 0 ? saved : 1)
  }, [pageKey])
  const setPage = (next: number) => {
    setPageState(next)
    try {
      sessionStorage.setItem(pageKey, String(next))
    } catch {
      // Unavailable storage only costs the remembered page.
    }
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const openRow = (row: T, { newTab: modified }: { newTab: boolean }) => {
    const href = getHref(row)
    // With "open detail pages in a new tab", a plain click opens one and a
    // modified click stays here: the modifier always means "the other way".
    const newTab = prefs?.openDetailsInNewTab ? !modified : modified
    if (newTab) {
      // A new tab starts without router state, so carry the app-wide range.
      const range = new URLSearchParams(location.searchStr).get('range')
      window.open(range ? `${href}${href.includes('?') ? '&' : '?'}range=${range}` : href, '_blank', 'noopener')
      return
    }
    saveListContext({ listHref, listTitle: title, hrefs: rows.map(getHref) })
    void navigate({ href })
  }
  const activation = useRowActivation<T>({ onActivate: openRow })

  return (
    <Layout
      height="fill"
      padding={6}
      header={
        <LayoutHeader>
          <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
            <VStack gap={1}>
              <Heading level={1}>{title}</Heading>
              {description && <Text color="secondary">{description}</Text>}
            </VStack>
            {actions && (
              <HStack gap={2} vAlign="center" wrap="wrap">
                {actions}
              </HStack>
            )}
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={5}>
            {summary}
            {toolbar}
            {rows.length === 0 ? (
              <EmptyState icon={<Icon icon={InboxIcon} size="lg" />} {...emptyState} />
            ) : (
              <VStack gap={3}>
                {/* Also keeps the table from being the content's first child,
                    which Astryx bleeds up under the page header. */}
                <Text type="supporting">
                  {formatNumber(rows.length)} {rows.length === 1 ? 'record' : 'records'}
                  {pageCount > 1 ? ` · page ${currentPage} of ${pageCount}` : ''}
                </Text>
                <Table
                  data={visible}
                  columns={columns}
                  idKey={getId}
                  density={tableDensity(prefs)}
                  textOverflow={prefs?.wrapLongValues ? 'wrap' : 'truncate'}
                  hasHover
                  plugins={{ activation }}
                />
                {pageCount > 1 && (
                  <HStack hAlign="end">
                    <Pagination
                      page={currentPage}
                      onChange={setPage}
                      totalItems={rows.length}
                      pageSize={pageSize}
                      variant="count"
                    />
                  </HStack>
                )}
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  )
}
