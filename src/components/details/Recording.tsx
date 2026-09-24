import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Slider } from '@astryxdesign/core/Slider'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import type { Replay } from '#/data/types'
import { formatNumber } from '#/lib/format'

export const TICK_MS = 50

/** Plays a transcript back character by character. Playback is compressed
 * to at most 20 seconds at 1× so long idle sessions stay watchable. */
export function Player({ replay }: { replay: Replay }) {
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
        <Button
          label="Restart"
          variant="secondary"
          onClick={() => setPosition(0)}
        />
        <StackItem size="fill">
          <Slider
            label="Seek"
            min={0}
            max={total}
            value={Math.floor(position)}
            onChange={(value: number) => setPosition(value)}
            formatValue={(value) =>
              `${((value / total) * replay.durationSeconds).toFixed(1)}s`
            }
          />
        </StackItem>
        <SegmentedControl
          label="Playback speed"
          size="sm"
          value={speed}
          onChange={setSpeed}
        >
          <SegmentedControlItem value="1" label="1×" />
          <SegmentedControlItem value="2" label="2×" />
          <SegmentedControlItem value="4" label="4×" />
        </SegmentedControl>
      </HStack>
      <Text type="supporting">
        {elapsed.toFixed(1)}s of {replay.durationSeconds.toFixed(1)}s terminal
        time · {formatNumber(replay.frames)} frames
      </Text>
    </VStack>
  )
}
