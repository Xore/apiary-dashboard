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
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { KillChainData, Protocol, TimeBucket } from '#/data/types'
import { formatDateTime, formatDay, formatNumber, formatTime } from '#/lib/format'

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

export type LineSeries = { key: string; label: string }

// First slots of the validated categorical order; lines never exceed three.
const LINE_COLORS = [
  'var(--color-data-categorical-blue)',
  'var(--color-data-categorical-orange)',
  'var(--color-data-categorical-teal)',
]

function LinesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  return (
    <Card padding={3}>
      <VStack gap={1}>
        <Text type="supporting">{formatTime(label)}</Text>
        {payload.map((entry) => (
          <HStack key={entry.name} gap={2} vAlign="center">
            <Swatch color={entry.color} />
            <Text type="supporting" color="primary">
              {entry.name}: {entry.value.toFixed(2)}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Card>
  )
}

/** Up to three series over hourly time buckets on one shared 0–1 axis. */
export function TimeLines<T extends { time: string }>({
  data,
  series,
  domain = [0, 1],
}: {
  data: T[]
  series: LineSeries[]
  domain?: [number, number]
}) {
  return (
    <VStack gap={3}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="time"
            tickFormatter={(value: string) => formatTime(value).slice(0, 5)}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={3}
          />
          <YAxis domain={domain} tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<LinesTooltip />} cursor={{ stroke: GRID_STROKE }} />
          {series.map((s, index) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={LINE_COLORS[index]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-background-card)' }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <HStack gap={4} wrap="wrap">
        {series.map((s, index) => (
          <HStack key={s.key} gap={1.5} vAlign="center">
            <Swatch color={LINE_COLORS[index]} />
            <Text type="supporting">{s.label}</Text>
          </HStack>
        ))}
      </HStack>
    </VStack>
  )
}

// ---- Kill chain ------------------------------------------------------------

function ValueTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <Card padding={3}>
      <Text type="supporting" color="primary">
        {payload[0].name}: {formatNumber(payload[0].value)}
      </Text>
    </Card>
  )
}

/** Tactic-to-tactic flow of attacker sessions, in kill-chain order. */
export function KillChainFlow({ flow }: { flow: KillChainData['flow'] }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <Sankey
        data={flow}
        nodePadding={28}
        nodeWidth={12}
        margin={{ top: 24, right: 56, bottom: 8, left: 8 }}
        link={{ stroke: 'var(--color-data-categorical-blue)', strokeOpacity: 0.25 }}
        node={({ x, y, width, height, payload }: { x: number; y: number; width: number; height: number; payload: { name: string; value: number } }) => (
          <g>
            <rect x={x} y={y} width={width} height={height} rx={2} fill="var(--color-data-categorical-blue)" />
            <text x={x} y={y - 8} fontSize={12} fill="var(--color-text-primary)">
              {payload.name}
              <tspan fill="var(--color-text-secondary)"> · {formatNumber(payload.value)}</tspan>
            </text>
          </g>
        )}
      >
        <Tooltip content={<ValueTooltip />} />
      </Sankey>
    </ResponsiveContainer>
  )
}

/** Each campaign as a bar from first to last observed activity. */
export function CampaignTimeline({ rows }: { rows: KillChainData['timeline'] }) {
  const data = rows.map((row) => ({ ...row, span: [Date.parse(row.first), Date.parse(row.last)] as [number, number] }))
  const min = Math.min(...data.map((d) => d.span[0]))
  const max = Math.max(...data.map((d) => d.span[1]))
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 26 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }} barCategoryGap={4}>
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis
          type="number"
          domain={[min, max]}
          tickFormatter={(value: number) => formatDay(new Date(value).toISOString())}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis type="category" dataKey="cidr" tick={AXIS_TICK} axisLine={false} tickLine={false} width={132} />
        <Tooltip
          cursor={{ fill: 'var(--color-background-muted)' }}
          content={({ active, payload }) => {
            const row = active && payload.length ? (payload[0].payload as (typeof data)[number]) : undefined
            if (!row) return null
            return (
              <Card padding={3}>
                <VStack gap={1}>
                  <Text type="supporting" color="primary">{row.cidr}</Text>
                  <Text type="supporting">
                    {formatDateTime(row.first)} → {formatDateTime(row.last)} · {formatNumber(row.events)} events
                  </Text>
                </VStack>
              </Card>
            )
          }}
        />
        <Bar dataKey="span" fill="var(--color-data-categorical-blue)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const HEAT_STEPS = [18, 34, 52, 72, 92]

/** ATT&CK techniques grouped by tactic; darker = more observed events (one
 * hue, light to dark), never severity. */
export function CoverageHeatmap({ tactics, cells }: { tactics: string[]; cells: KillChainData['coverage'] }) {
  const max = Math.max(1, ...cells.map((c) => c.events))
  const step = (events: number) => HEAT_STEPS[Math.min(HEAT_STEPS.length - 1, Math.floor((Math.log2(events + 1) / Math.log2(max + 1)) * HEAT_STEPS.length))]
  const columns = tactics.map((tactic) => cells.filter((c) => c.tactic === tactic))
  const cellW = 150
  const cellH = 44
  const headH = 36
  const rows = Math.max(...columns.map((c) => c.length))
  return (
    <VStack gap={3}>
      <svg viewBox={`0 0 ${tactics.length * (cellW + 6)} ${headH + rows * (cellH + 6)}`} width="100%" role="img" aria-label="ATT&CK technique coverage by tactic">
        {columns.map((column, ci) => (
          <g key={tactics[ci]} transform={`translate(${ci * (cellW + 6)}, 0)`}>
            <text x={0} y={22} fontSize={12} fontWeight={600} fill="var(--color-text-primary)">
              {tactics[ci]}
            </text>
            {column.map((cell, ri) => {
              const pct = step(cell.events)
              return (
                <g key={cell.technique} transform={`translate(0, ${headH + ri * (cellH + 6)})`}>
                  <rect
                    width={cellW}
                    height={cellH}
                    rx={4}
                    fill={`color-mix(in srgb, var(--color-data-categorical-blue) ${pct}%, var(--color-background-card))`}
                  >
                    <title>{`${cell.technique} ${cell.name}: ${formatNumber(cell.events)} events`}</title>
                  </rect>
                  <text x={8} y={18} fontSize={11} fill={pct > 70 ? 'var(--color-background-card)' : 'var(--color-text-primary)'}>
                    {cell.technique}
                  </text>
                  <text x={8} y={34} fontSize={10} fill={pct > 70 ? 'var(--color-background-card)' : 'var(--color-text-primary)'}>
                    {cell.name.length > 22 ? `${cell.name.slice(0, 21)}…` : cell.name}
                  </text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
      <HStack gap={2} vAlign="center">
        <Text type="supporting">Fewer events</Text>
        <svg width={HEAT_STEPS.length * 22} height={12} aria-hidden="true">
          {HEAT_STEPS.map((pct, i) => (
            <rect key={pct} x={i * 22} width={20} height={12} rx={2} fill={`color-mix(in srgb, var(--color-data-categorical-blue) ${pct}%, var(--color-background-card))`} />
          ))}
        </svg>
        <Text type="supporting">More events</Text>
      </HStack>
    </VStack>
  )
}
