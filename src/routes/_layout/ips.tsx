import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Divider } from '@astryxdesign/core/Divider'
import { Grid } from '@astryxdesign/core/Grid'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { createFileRoute } from '@tanstack/react-router'
import { CountTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { PageFrame } from '#/components/PageFrame'
import { WorldMap } from '#/components/WorldMap'
import { getSourceProfiles } from '#/data/queries'
import type { SourceProfile } from '#/data/types'
import { downloadCsv } from '#/lib/export'
import { formatDateTime, formatNumber } from '#/lib/format'

const PAGE = 24

export const Route = createFileRoute('/_layout/ips')({
  loader: () => getSourceProfiles(),
  component: SourcesPage,
})

function Stat({ value, label, href }: { value: number; label: string; href: string }) {
  return (
    <StackItem size="fill">
      <Link href={href}>
        <VStack gap={0}>
          <Text weight="semibold">{formatNumber(value)}</Text>
          <Text type="supporting">{label}</Text>
        </VStack>
      </Link>
    </StackItem>
  )
}

/** One source address: where it is, what it did, and a way into each. */
function SourceCard({ source }: { source: SourceProfile }) {
  const ip = encodeURIComponent(source.ip)
  return (
    <Card>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" gap={2}>
          <Link href={`/investigate/ip/${ip}`}>
            <Text weight="semibold">{source.ip}</Text>
          </Link>
          <Token label={source.country} size="sm" color="blue" href={`/events?country=${source.country}`} />
        </HStack>
        <Text type="supporting">{source.org}</Text>
        <HStack gap={2}>
          <Stat value={source.events} label="events" href={`/events?ip=${ip}`} />
          <Stat value={source.logins} label="logins" href={`/events?ip=${ip}&kind=login`} />
          <Stat value={source.sessions} label="sessions" href={`/investigate/ip/${ip}`} />
        </HStack>
        <Divider />
        <HStack gap={1} wrap="wrap">
          {source.sensors.map((sensor) => (
            <Token key={sensor} label={sensor} size="sm" href={`/events?ip=${ip}&sensor=${sensor}`} />
          ))}
        </HStack>
        <Text type="supporting">
          {formatDateTime(source.first)} → {formatDateTime(source.last)}
        </Text>
      </VStack>
    </Card>
  )
}

function SourcesPage() {
  const { sources, mapPoints } = Route.useLoaderData()
  const [shown, setShown] = useState(PAGE)

  return (
    <PageFrame
      title="Attack sources"
      description="Every source address the sensors observed, with event volume, location, and activity window."
      actions={
        <>
          <Text type="supporting">{formatNumber(sources.length)} unique IPs</Text>
          <Button
            label="CSV"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            onClick={() =>
              downloadCsv('ips.csv', sources, ['ip', 'country', 'org', 'events', 'logins', 'sessions', 'sensors', 'first', 'last'])
            }
          />
        </>
      }
    >
      <VStack gap={6}>
        <Grid columns={{ minWidth: 460, repeat: 'fit' }} gap={4}>
          <Panel title="Attack origins" action={<Text type="supporting">Click a country to see its events</Text>}>
            <WorldMap points={mapPoints} />
          </Panel>
          <VStack gap={4}>
            <Grid columns={{ minWidth: 150, repeat: 'fit' }} gap={3}>
              <StatTile label="Unique source IPs" value={sources.length} />
              <StatTile label="Countries" value={mapPoints.length} />
              <StatTile label="Sessions" value={sources.reduce((n, s) => n + s.sessions, 0)} />
              <StatTile label="Login attempts" value={sources.reduce((n, s) => n + s.logins, 0)} href="/events?kind=login" />
            </Grid>
            <Panel title="By country">
              <CountTable
                header="Country"
                countHeader="Events"
                rows={[...mapPoints].sort((a, b) => b.events - a.events).slice(0, 8).map((p) => ({ id: p.country, label: p.country, count: p.events }))}
                linkTo={(c) => `/events?country=${c}`}
              />
            </Panel>
          </VStack>
        </Grid>
        <VStack gap={4}>
          <Heading level={2}>Sources</Heading>
          <Grid columns={{ minWidth: 260, repeat: 'fill' }} gap={4}>
            {sources.slice(0, shown).map((source) => (
              <SourceCard key={source.ip} source={source} />
            ))}
          </Grid>
          {shown < sources.length && (
            <HStack gap={3} hAlign="center" vAlign="center">
              <Text type="supporting">
                {formatNumber(shown)} of {formatNumber(sources.length)}
              </Text>
              <Button label="View more" variant="secondary" size="sm" onClick={() => setShown((n) => n + PAGE)} />
            </HStack>
          )}
        </VStack>
      </VStack>
    </PageFrame>
  )
}
