import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { StopIcon } from '@heroicons/react/24/solid'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Protocol, TimeBucket } from '#/data/types'
import { formatNumber, formatTime } from '#/lib/format'

// Colors follow the protocol, never its rank, so filtering never repaints a
// series. Order validated (light surface) with the dataviz palette checker:
// blue, orange, teal, purple, pink; everything else folds into gray "Other".
const SERIES = [
  { key: 'ssh', label: 'SSH', color: 'var(--color-data-categorical-blue)' },
  { key: 'telnet', label: 'Telnet', color: 'var(--color-data-categorical-orange)' },
  { key: 'http', label: 'HTTP', color: 'var(--color-data-categorical-teal)' },
  { key: 'smb', label: 'SMB', color: 'var(--color-data-categorical-purple)' },
  { key: 'rdp', label: 'RDP', color: 'var(--color-data-categorical-pink)' },
  { key: 'other', label: 'Other', color: 'var(--color-text-secondary)' },
] as const

const NAMED: ReadonlySet<string> = new Set(SERIES.map((s) => s.key))

const AXIS_TICK = { fontSize: 12, fill: 'var(--color-text-secondary)' }
const GRID_STROKE = 'var(--color-border)'

type TimelineRow = { time: string } & Record<string, number | string>

function toRows(buckets: TimeBucket[]): TimelineRow[] {
  return buckets.map((bucket) => {
    const row: TimelineRow = { time: bucket.time, other: 0 }
    for (const [protocol, count] of Object.entries(bucket.byProtocol) as Array<[Protocol, number]>) {
      if (NAMED.has(protocol)) row[protocol] = count
      else row.other = (row.other as number) + count
    }
    return row
  })
}

function Swatch({ color }: { color: string }) {
  return <Icon icon={StopIcon} size="xsm" style={{ color }} />
}

function TimelineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0)
  return (
    <Card padding={3}>
      <VStack gap={1}>
        <Text type="supporting">
          {formatTime(label)} · {formatNumber(total)} events
        </Text>
        {[...payload].reverse().map((entry) => (
          <HStack key={entry.name} gap={2} vAlign="center">
            <Swatch color={entry.color} />
            <Text type="supporting" color="primary">
              {entry.name}: {formatNumber(entry.value || 0)}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Card>
  )
}

/** Hourly events stacked by protocol. */
export function ProtocolTimeline({ buckets }: { buckets: TimeBucket[] }) {
  const rows = toRows(buckets)
  return (
    <VStack gap={3}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="time"
            tickFormatter={(value: string) => formatTime(value).slice(0, 5)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={3}
          />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<TimelineTooltip />} cursor={{ fill: 'var(--color-background-muted)' }} />
          {SERIES.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId="protocol"
              fill={series.color}
              stroke="var(--color-background-card)"
              strokeWidth={1}
              radius={index === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <HStack gap={4} wrap="wrap">
        {SERIES.map((series) => (
          <HStack key={series.key} gap={1.5} vAlign="center">
            <Swatch color={series.color} />
            <Text type="supporting">{series.label}</Text>
          </HStack>
        ))}
      </HStack>
    </VStack>
  )
}

export function Sparkline({ data }: { data: number[] }) {
  const rows = data.map((value, index) => ({ index, value }))
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={rows} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-data-categorical-blue)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
