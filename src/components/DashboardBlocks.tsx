import { SkeletonTable } from './SkeletonTable'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { useContext } from 'react'
import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import type { CountRow } from '#/data/types'
import { formatChange, formatCompact, formatNumber } from '#/lib/format'
import type { EntityKind } from '#/lib/entities'
import { Sparkline } from './charts'
import { EntityLink } from './EntityLink'
import { tableDensity, usePreferences } from '#/lib/prefs'
import { DetailContext } from './PageFrame'

/** A titled block with an optional trailing action (usually a Link): a
 * widget card on a dashboard; on a detail page, where the blocks are parts
 * of one record, just its heading and content, grouped by spacing (the
 * weakest container that reads as a group, DESIGN.md). Either way it is
 * the page's second heading level. */
export function Panel({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  const inRecord = useContext(DetailContext)
  const body = (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center">
        <Heading level={3} accessibilityLevel={2}>
          {title}
        </Heading>
        {action}
      </HStack>
      {children}
    </VStack>
  )
  // Tight within a block, generous between them: without a card's padding
  // the space after each block is what separates it from the next.
  return inRecord ? <VStack paddingBlockEnd={6}>{body}</VStack> : <Card>{body}</Card>
}

type StatTileProps = {
  label: string
  /** Undefined while the page's data loads: a skeleton in its place. */
  value: number | undefined
  /** Previous-period value; shows a signed change when present. */
  previous?: number
  caption?: string
  trend?: number[]
  /** Makes the tile a link, e.g. to a pre-filtered view. */
  href?: string
}

/** Headline number tile. */
export function StatTile({ label, value, previous, caption, trend, href }: StatTileProps) {
  if (value === undefined)
    return (
      <Card aria-busy>
        <VStack gap={2}>
          <Text type="label" color="secondary">
            {label}
          </Text>
          <Skeleton width={72} height={28} />
          {caption !== undefined && <Skeleton width="60%" height={12} />}
        </VStack>
      </Card>
    )
  const body = (
    <VStack gap={2}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <HStack gap={2} vAlign="center">
        <Text size="xl" weight="semibold">{formatCompact(value)}</Text>
        {previous !== undefined && (
          <HStack gap={1} vAlign="center">
            <Icon icon={value >= previous ? ArrowUpIcon : ArrowDownIcon} size="xsm" color="secondary" />
            <Text type="supporting">{formatChange(value, previous)}</Text>
          </HStack>
        )}
      </HStack>
      {caption && <Text type="supporting">{caption}</Text>}
      {trend && <Sparkline data={trend} />}
    </VStack>
  )
  return href ? <ClickableCard href={href} label={`${label}: ${formatNumber(value)}`}>{body}</ClickableCard> : <Card>{body}</Card>
}

/** Two-column "value, count" table for top-N breakdowns. */
export function CountTable({ header, rows, countHeader = 'Count', isCode = false, linkTo, entity }: {
  header: string
  /** Undefined while loading: the columns, and skeleton rows. */
  rows: CountRow[] | undefined
  countHeader?: string
  isCode?: boolean
  /** Makes each value a link, e.g. to its own detail page. */
  linkTo?: (label: string) => string
  /** Renders each value as an EntityLink of this kind (page + value menu). */
  entity?: EntityKind
}) {
  const prefs = usePreferences()
  const columns: TableColumn<CountRow>[] = [
    {
      key: 'label',
      header,
      width: proportional(1),
      renderCell: (row) => {
        if (entity) return <EntityLink kind={entity} id={row.label} />
        const text = isCode ? <Text type="code">{row.label}</Text> : row.label
        return linkTo ? <Link href={linkTo(row.label)}>{text}</Link> : text
      },
    },
    { key: 'count', header: countHeader, width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.count) },
  ]
  if (!rows) return <SkeletonTable columns={columns} rows={8} density={tableDensity(prefs)} />
  return <Table data={rows} columns={columns} idKey="id" density={tableDensity(prefs)} />
}

/** A titled top-N breakdown; renders a short note instead of an empty table. */
export function MiniTable({ title, header = 'Value', countHeader, rows, isCode, linkTo, entity }: {
  title: string
  header?: string
  countHeader?: string
  entity?: EntityKind
  rows: CountRow[] | undefined
  isCode?: boolean
  linkTo?: (label: string) => string
}) {
  return (
    <Panel title={title}>
      {!rows || rows.length ? (
        <CountTable header={header} countHeader={countHeader} rows={rows} isCode={isCode} linkTo={linkTo} entity={entity} />
      ) : (
        <Text type="supporting">Nothing recorded.</Text>
      )}
    </Panel>
  )
}

/** Tiles whose labels come with the data: `count` skeleton tiles in their
 * place while it loads. */
export function SkeletonTiles({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} aria-busy>
          <VStack gap={2}>
            <Skeleton width="50%" height={14} />
            <Skeleton width={72} height={28} />
          </VStack>
        </Card>
      ))}
    </>
  )
}
