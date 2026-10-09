import { SkeletonTable } from './SkeletonTable'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { useContext } from 'react'
import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { EmptyState } from '@astryxdesign/core/EmptyState'
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
import { ENTITIES } from '#/lib/entities'
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
  // the space after each block is what separates it from the next. Either
  // container is the block's own: an Astryx table bleeds to the edges of the
  // nearest one, so blocks side by side would otherwise spill into each other
  // (a transparent padding-0 Card bleeds by nothing and draws nothing; a
  // Section would, as it bleeds out of its own parent).
  return inRecord ? (
    <VStack paddingBlockEnd={6}>
      <Card variant="transparent" padding={0}>{body}</Card>
    </VStack>
  ) : (
    <Card>{body}</Card>
  )
}

type StatTileProps = {
  label: string
  /** Undefined while the page's data loads: a skeleton in its place. Null when
   * the backend cannot supply the figure: "not available", never a zero. */
  value: number | null | undefined
  /** Previous-period value; shows a signed change when present. */
  previous?: number | null
  caption?: string
  trend?: number[]
  /** Makes the tile a link, e.g. to a pre-filtered view. */
  href?: string
}

/** A loading tile's lines at the loaded tile's line heights (label 20,
 * number 29, caption 20, sparkline 36 px), so nothing moves when the data
 * arrives. */
function TileSkeletonLines({ caption, trend }: { caption: boolean; trend: boolean }) {
  return (
    <>
      <Skeleton width={72} height={29} />
      {caption && <Skeleton width="60%" height={20} />}
      {trend && <Skeleton width="100%" height={36} />}
    </>
  )
}

/** No change, or one too small to show at one decimal (+0.0 %). */
const isFlat = (value: number, previous: number) => (previous === 0 ? value === 0 : Math.abs((value - previous) / previous) < 0.0005)

/** A 24 h breakdown's title. When the breakdown counts only the latest rows of
 * the window, the title says so: "latest N of 24h" rather than a total. */
export const windowTitle = (title: string, sampled: number | null | undefined): string =>
  sampled ? title.replace(', 24h', `, latest ${formatNumber(sampled)} of 24h`) : title

/** Stands in for a widget the backend cannot fill yet. It says so, so an
 * empty chart or table is never read as a quiet fleet. */
export function NotAvailable() {
  return <EmptyState isCompact title="Not available from the backend yet" />
}

/** Headline number tile. `null` is a figure the backend cannot supply yet. */
export function StatTile({ label, value, previous, caption, trend, href }: StatTileProps) {
  if (value === null)
    return (
      <Card>
        <VStack gap={2}>
          <Text type="label" color="secondary">
            {label}
          </Text>
          <NotAvailable />
        </VStack>
      </Card>
    )
  if (value === undefined)
    return (
      <Card aria-busy>
        <VStack gap={2}>
          <Text type="label" color="secondary">
            {label}
          </Text>
          <TileSkeletonLines caption={caption !== undefined} trend={trend !== undefined} />
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
        {typeof previous === 'number' &&
          (isFlat(value, previous) ? (
            // An arrow on no change reads as a rise.
            <Text type="supporting">no change</Text>
          ) : (
            <HStack gap={1} vAlign="center">
              <Icon icon={value > previous ? ArrowUpIcon : ArrowDownIcon} size="xsm" color="secondary" />
              <Text type="supporting">{formatChange(value, previous)}</Text>
            </HStack>
          ))}
      </HStack>
      {caption && <Text type="supporting">{caption}</Text>}
      {trend && <Sparkline data={trend} />}
    </VStack>
  )
  // Raised: Astryx's cue that the whole card opens something; plain tiles stay flat.
  return href ? <ClickableCard href={href} label={`${label}: ${formatNumber(value)}`} elevation="low">{body}</ClickableCard> : <Card>{body}</Card>
}

/** Two-column "value, count" table for top-N breakdowns. One line per row,
 * so tables side by side end level; a cut value is whole in its tooltip. */
export function CountTable({ header, label = header, rows, countHeader = 'Count', isCode = false, linkTo, entity }: {
  header: string
  /** What screen readers call the table; defaults to the value header. */
  label?: string
  /** Undefined while loading: the columns, and skeleton rows. Null when the
   * backend cannot supply the rows: "not available". */
  rows: CountRow[] | null | undefined
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
        const text =
          isCode || (entity && ENTITIES[entity].isCode) ? (
            <Text type="code" color="inherit" maxLines={1}>{row.label}</Text>
          ) : (
            <Text color="inherit" maxLines={1}>{row.label}</Text>
          )
        if (entity) return <EntityLink kind={entity} id={row.label}>{text}</EntityLink>
        return linkTo ? <Link href={linkTo(row.label)}>{text}</Link> : text
      },
    },
    { key: 'count', header: countHeader, width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.count) },
  ]
  if (rows === null) return <NotAvailable />
  if (!rows) return <SkeletonTable columns={columns} rows={8} density={tableDensity(prefs)} label={label} />
  return <Table data={rows} columns={columns} idKey="id" density={tableDensity(prefs)} textOverflow="truncate" aria-label={label} />
}

/** A titled top-N breakdown; renders a short note instead of an empty table. */
export function MiniTable({ title, header = 'Value', countHeader, rows, isCode, linkTo, entity }: {
  title: string
  header?: string
  countHeader?: string
  entity?: EntityKind
  rows: CountRow[] | null | undefined
  isCode?: boolean
  linkTo?: (label: string) => string
}) {
  return (
    <Panel title={title}>
      {!rows || rows.length ? (
        <CountTable header={header} label={title} countHeader={countHeader} rows={rows} isCode={isCode} linkTo={linkTo} entity={entity} />
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
            <Skeleton width="50%" height={20} />
            <TileSkeletonLines caption trend />
          </VStack>
        </Card>
      ))}
    </>
  )
}
