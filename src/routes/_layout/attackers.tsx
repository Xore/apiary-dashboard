import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getAttackers } from '#/data/queries'
import type { AttackerEntity } from '#/data/types'
import { formatDateTime, formatNumber, formatTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

export const Route = createFileRoute('/_layout/attackers')({
  loader: () => getAttackers(),
  component: AttackersPage,
})

const attckUrl = (id: string) => `https://attack.mitre.org/techniques/${id.replaceAll('.', '/')}/`

const columns: TableColumn<AttackerEntity>[] = [
  {
    key: 'id',
    header: 'Entity',
    width: pixel(112),
    renderCell: (row) => (
      <Text type="code" hasTruncateTooltip>
        {row.id.slice(0, 8)}
      </Text>
    ),
  },
  { key: 'ips', header: 'IPs', width: pixel(56), align: 'end', renderCell: (row) => row.ips.length },
  { key: 'events', header: 'Events', width: pixel(80), align: 'end', renderCell: (row) => formatNumber(row.events) },
  {
    key: 'sensors',
    header: 'Sensors',
    width: proportional(3),
    renderCell: (row) => (
      <HStack gap={1} vAlign="center">
        {row.sensors.slice(0, 2).map((sensor) => (
          <Token key={sensor} label={sensor} size="sm" />
        ))}
        {row.sensors.length > 2 && <Text type="supporting">+{row.sensors.length - 2}</Text>}
      </HStack>
    ),
  },
  { key: 'last', header: 'Last', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.last)}</Text> },
  {
    key: 'verdicts',
    header: 'Flags',
    width: pixel(152),
    renderCell: (row) => (
      <HStack gap={1}>
        {row.verdicts.length > 0 && <Token label="verdict" size="sm" color="purple" />}
        {row.scan && <Token label={row.scan} size="sm" color="orange" />}
      </HStack>
    ),
  },
]

function Evidence<T>({ title, items, empty, render }: { title: string; items: T[]; empty: string; render: (item: T) => ReactNode }) {
  return (
    <VStack gap={2}>
      <Heading level={3}>{`${title} (${items.length})`}</Heading>
      {items.length ? (
        <VStack gap={1}>
          {items.map((item, index) => (
            <HStack key={index}>{render(item)}</HStack>
          ))}
        </VStack>
      ) : (
        <Text type="supporting">{empty}</Text>
      )}
    </VStack>
  )
}

function Dossier({ entity }: { entity: AttackerEntity }) {
  const [tab, setTab] = useState('overview')
  const recordings = `/recordings?ip=${encodeURIComponent(entity.ips[0] ?? '')}`

  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Text type="code">{entity.id.slice(0, 8)}</Text>
        <Button label="Copy ID" size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(entity.id)} />
      </HStack>
      <TabList value={tab} onChange={setTab} size="sm" hasDivider>
        <Tab value="overview" label="Overview" />
        <Tab value="indicators" label="Indicators" />
      </TabList>
      {tab === 'overview' ? (
        <VStack gap={4}>
          <MetadataList label={{ position: 'start', width: 96 }}>
            <MetadataListItem label="Entity">
              <Text type="code">{entity.id}</Text>
            </MetadataListItem>
            <MetadataListItem label="Events">{formatNumber(entity.events)}</MetadataListItem>
            <MetadataListItem label="Updated">{formatDateTime(entity.updated)}</MetadataListItem>
            <MetadataListItem label="First seen">{formatDateTime(entity.first)}</MetadataListItem>
            <MetadataListItem label="Last seen">{formatDateTime(entity.last)}</MetadataListItem>
            {entity.scan && (
              <MetadataListItem label="Scan shape">
                {entity.scan === 'horizontal'
                  ? `horizontal: ${entity.destIps} distinct destinations`
                  : `vertical: ${entity.portsTouched} ports across ${entity.destIps} hosts`}
              </MetadataListItem>
            )}
          </MetadataList>
          {entity.ips.length > 0 && <Link href={recordings}>Session recordings</Link>}
          <Evidence
            title="Member IPs"
            items={entity.ips}
            empty="No member IPs recorded."
            render={(ip) => <EntityLink kind="source" id={ip} />}
          />
          <Evidence title="Sensors" items={entity.sensors} empty="No sensors recorded." render={(s) => <Token label={s} size="sm" />} />
        </VStack>
      ) : (
        <VStack gap={4}>
          <Evidence
            title="Credential pairs"
            items={entity.credentials}
            empty="No credential pairs recorded."
            render={(pair) => <Text type="code">{pair}</Text>}
          />
          <Evidence
            title="Fingerprints"
            items={entity.fingerprints}
            empty="No fingerprints recorded."
            render={(fp) => <Text type="code">{fp}</Text>}
          />
          <Evidence
            title="Payload hashes"
            items={entity.payloads}
            empty="No payload hashes recorded."
            render={(hash) => (
              <EntityLink kind="payload" id={hash}>
                <Text type="code">{`${hash.slice(0, 24)}…`}</Text>
              </EntityLink>
            )}
          />
          <Evidence
            title="Ghidra verdicts"
            items={entity.verdicts}
            empty="No Ghidra verdicts recorded."
            render={(verdict) => <Token label={verdict} size="sm" color="purple" />}
          />
          <Evidence
            title="ATT&CK techniques"
            items={entity.techniques}
            empty="No ATT&CK techniques recorded."
            render={(technique) => <Token label={technique} size="sm" color="blue" href={attckUrl(technique)} />}
          />
        </VStack>
      )}
    </VStack>
  )
}

function AttackersPage() {
  const attackers = Route.useLoaderData()
  const merged = attackers.filter((a) => a.ips.length > 1).length
  return (
    <RecordList
      title="Attacker identities"
      description="Durable entities merged across IP churn by shared fingerprint, payload, and credential signals."
      actions={
        <>
          <Text type="supporting">{attackers.length} identities</Text>
          <Token label={`${merged} merged across >1 IP`} size="sm" />
        </>
      }
      rows={attackers}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Identity details"
      renderInspector={(row) => <Dossier key={row.id} entity={row} />}
      emptyState={{
        title: 'No attacker entities yet',
        description: 'IPs sharing two or more strong signals merge into durable entities as traffic accumulates.',
      }}
    />
  )
}
