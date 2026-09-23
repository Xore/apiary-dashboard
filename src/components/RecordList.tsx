import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout'
import { Pagination } from '@astryxdesign/core/Pagination'
import { ResizeHandle, useResizable } from '@astryxdesign/core/Resizable'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { CursorArrowRaysIcon, InboxIcon } from '@heroicons/react/24/outline'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { saveListContext } from '#/lib/listContext'
import { useRowActivation } from './useRowActivation'

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
  /** The row's entity page. When set, a row opens that page and there is no
   * details panel (epic #25). */
  getHref?: (row: T) => string
  /** Legacy details panel for lists whose entities have no page yet. */
  inspectorTitle?: string
  renderInspector?: (row: T) => ReactNode
  emptyState: { title: string; description: string }
  pageSize?: number
}

/** A store-backed record page: summary band, filter row, and a paged
 * full-width table whose rows open their entity page. Lists whose entities
 * have no page yet still use a details panel (removed in epic #25 Phase D). */
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
  inspectorTitle = 'Details',
  renderInspector,
  emptyState,
  pageSize = 25,
}: RecordListProps<T>) {
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isNarrow = useMediaQuery('(max-width: 1024px)')
  const inspector = useResizable({ defaultSize: 360, minSize: 300, maxSize: 560 })

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selected = rows.find((row) => getId(row) === selectedId) ?? null
  const openRow = (row: T, { newTab }: { newTab: boolean }) => {
    if (!getHref) {
      setSelectedId(getId(row))
      return
    }
    const href = getHref(row)
    if (newTab) {
      // A new tab starts without router state, so carry the app-wide range.
      const range = new URLSearchParams(location.searchStr).get('range')
      window.open(range ? `${href}${href.includes('?') ? '&' : '?'}range=${range}` : href, '_blank', 'noopener')
      return
    }
    saveListContext({ listHref, listTitle: title, hrefs: rows.map(getHref) })
    void navigate({ href })
  }
  const activation = useRowActivation<T>({ getId, selectedId: getHref ? null : selectedId, onActivate: openRow })
  const hasPanel = !getHref && renderInspector !== undefined

  const inspectorBody = selected && renderInspector ? (
    renderInspector(selected)
  ) : (
    <EmptyState
      isCompact
      icon={<Icon icon={CursorArrowRaysIcon} size="lg" />}
      title="Nothing selected"
      description="Select a row to see its details."
    />
  )

  return (
    <>
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
                  <Table
                    data={visible}
                    columns={columns}
                    idKey={getId}
                    density="compact"
                    textOverflow="truncate"
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
        end={
          isNarrow || !hasPanel ? undefined : (
            <>
              <ResizeHandle
                direction="horizontal"
                hasDivider
                isAlwaysVisible={false}
                resizable={inspector.props}
                label="Resize inspector"
              />
              <LayoutPanel width={inspector.size} padding={4} label={inspectorTitle}>
                <VStack gap={4}>
                  <Heading level={2}>{inspectorTitle}</Heading>
                  {inspectorBody}
                </VStack>
              </LayoutPanel>
            </>
          )
        }
      />
      {isNarrow && hasPanel && (
        <Dialog isOpen={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)} width={560} padding={4}>
          <DialogHeader title={inspectorTitle} onOpenChange={(open) => !open && setSelectedId(null)} />
          {inspectorBody}
        </Dialog>
      )}
    </>
  )
}
