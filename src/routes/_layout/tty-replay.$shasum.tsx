import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Slider } from '@astryxdesign/core/Slider'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { useViewTabs } from '#/components/ViewTabs'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { MiniTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { NotFound } from '#/components/NotFound'
import { PageFrame } from '#/components/PageFrame'
import { getReplayDetail } from '#/data/queries'
import type { Replay } from '#/data/types'
import { downloadJson } from '#/lib/export'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/tty-replay/$shasum')({
  validateSearch: (search: Record<string, unknown>): { tab?: 'attacker' } => ({
    tab: search.tab === 'attacker' ? 'attacker' : undefined,
  }),
  loader: async ({ params }) => {
    const detail = await getReplayDetail(params.shasum)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => <NotFound title="Session recording" description="No recording found for this id." />,
  component: ReplayPage,
})

const TICK_MS = 50

/** Plays a transcript back character by character. Playback is compressed
 * to at most 20 seconds at 1× so long idle sessions stay watchable. */
function Player({ replay }: { replay: Replay }) {
  const total = replay.transcript.length
  const seconds = Math.min(20, Math.max(4, replay.durationSeconds))
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('1')

  useEffect(() => {
    if (!playing) return
    const step = (total / (seconds * (1000 / TICK_MS))) * Number(speed)
    const timer = setInterval(() => {
      setPosition((p) => {
        const next = Math.min(total, p + step)
        if (next >= total) setPlaying(false)
        return next
      })
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [playing, speed, total, seconds])

  // CodeBlock re-highlights asynchronously and cannot keep up with a
  // 20 fps stream, so the terminal is plain monospace lines.
  const lines = replay.transcript.slice(0, Math.floor(position)).split('\n')
  const elapsed = (position / total) * replay.durationSeconds

  return (
    <VStack gap={3}>
      <Card variant="muted" height={320}>
        <VStack gap={0} isScrollable>
          {lines.map((line, i) => (
            <Text key={i} type="code" textWrap="nowrap">
              {line || '\u00a0'}
              {i === lines.length - 1 && playing ? '▌' : ''}
            </Text>
          ))}
        </VStack>
      </Card>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Button
          label={playing ? 'Pause' : position >= total ? 'Replay' : 'Play'}
          onClick={() => {
            if (position >= total) setPosition(0)
            setPlaying((p) => !p || position >= total)
          }}
        />
        <Button label="Restart" variant="secondary" onClick={() => setPosition(0)} />
        <StackItem size="fill">
          <Slider
            label="Seek"
            min={0}
            max={total}
            value={Math.floor(position)}
            onChange={(value: number) => setPosition(value)}
            formatValue={(value) => `${((value / total) * replay.durationSeconds).toFixed(1)}s`}
          />
        </StackItem>
        <SegmentedControl label="Playback speed" size="sm" value={speed} onChange={setSpeed}>
          <SegmentedControlItem value="1" label="1×" />
          <SegmentedControlItem value="2" label="2×" />
          <SegmentedControlItem value="4" label="4×" />
        </SegmentedControl>
      </HStack>
      <Text type="supporting">
        {elapsed.toFixed(1)}s of {replay.durationSeconds.toFixed(1)}s terminal time · {formatNumber(replay.frames)} frames
      </Text>
    </VStack>
  )
}

function ReplayPage() {
  const { replay, sessions, attacker } = Route.useLoaderData()
  const { shasum } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  useViewTabs({
    label: 'Recording views',
    tabs: [{ id: 'playback', label: 'Playback' }, { id: 'attacker', label: 'Attacker replay' }],
    value: tab ?? 'playback',
    onChange: (value) => void navigate({ search: { tab: value === 'attacker' ? 'attacker' : undefined } }),
  })

  return (
    <PageFrame
      title="Session recording"
      description={`Recording ${shasum.slice(0, 16)}… · shared by ${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}, since bot traffic repeats itself`}
      actions={
        <Button
          label="Download (.cast)"
          size="sm"
          variant="secondary"
          onClick={() => downloadJson(`${shasum.slice(0, 12)}.cast.json`, { version: 2, duration: replay.durationSeconds, transcript: replay.transcript })}
        />
      }
    >
      <VStack gap={5}>
        {tab !== 'attacker' ? (
          <VStack gap={4}>
            <Player replay={replay} />
            <MiniTable
              title="Sessions that produced this recording"
              header="Session"
              countHeader="Seconds"
              rows={sessions.slice(0, 15).map((r) => ({ id: r.session, label: r.session, count: Math.round(r.durationMs / 1000) }))}
              isCode
              linkTo={(id) => `/sessions/${id}`}
            />
          </VStack>
        ) : attacker ? (
          <VStack gap={4}>
            <HStack gap={3} vAlign="center">
              <Text weight="semibold">Source</Text>
              <Link href={`/investigate/ip/${attacker.ip}`}>{attacker.ip}</Link>
              <Text type="supporting">first session closed {formatDateTime(sessions[0].when)}</Text>
            </HStack>
            <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={4}>
              <StatTile label="Events" value={attacker.events} />
              <StatTile label="Sessions" value={attacker.sessions} />
              <StatTile label="Distinct commands" value={attacker.commands.length} />
            </Grid>
            <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
              <MiniTable title="Commands" header="Command" rows={attacker.commands} isCode />
              <MiniTable title="Credentials tried" header="Pair" rows={attacker.credentials} isCode />
              <MiniTable title="Sensors" header="Sensor" rows={attacker.sensors} linkTo={(s) => `/sensors/${s}`} />
              <MiniTable title="Sessions" header="Session" rows={attacker.sessionIds} isCode linkTo={(id) => `/sessions/${id}`} />
            </Grid>
          </VStack>
        ) : (
          <Panel title="Attacker replay">
            <Text color="secondary">This recording is unattributed: every session that produced it arrived over the tunnel without a real client address.</Text>
          </Panel>
        )}
      </VStack>
    </PageFrame>
  )
}
