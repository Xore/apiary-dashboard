import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getCommands } from '#/data/queries'
import type { HoneypotEvent } from '#/data/types'
import { downloadCsv } from '#/lib/export'
import { formatClock, formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/commands')({
  loader: () => getCommands(),
  component: CommandsPage,
})

const columns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: 'Seen (UTC)', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'sensor', header: 'Sensor', width: pixel(152), renderCell: (row) => <Token label={row.sensor} size="sm" /> },
  { key: 'srcIp', header: 'Source IP', width: pixel(136), renderCell: (row) => <Link href={`/investigate/ip/${row.srcIp}`}>{row.srcIp}</Link> },
  { key: 'command', header: 'Command', width: proportional(4), renderCell: (row) => <Text type="code">{row.command ?? row.summary}</Text> },
]

function CommandInspector({ event }: { event: HoneypotEvent }) {
  return (
    <VStack gap={4}>
      <CodeBlock code={event.command ?? event.summary} language="bash" hasLanguageLabel={false} isWrapped />
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="Seen">{formatDateTime(event.timestamp)}</MetadataListItem>
        <MetadataListItem label="Source">
          <Link href={`/investigate/ip/${event.srcIp}`}>{event.srcIp}</Link>
        </MetadataListItem>
        <MetadataListItem label="Sensor">{event.sensor}</MetadataListItem>
        <MetadataListItem label="Session">
          <Link href={`/sessions/${event.sessionId}`}>{event.sessionId}</Link>
        </MetadataListItem>
      </MetadataList>
      <VStack gap={2}>
        <Heading level={3}>Record</Heading>
        <CodeBlock code={JSON.stringify(event, null, 2)} language="json" maxHeight={280} />
      </VStack>
    </VStack>
  )
}

function CommandsPage() {
  const commands = Route.useLoaderData()
  return (
    <RecordList
      title="Executed commands"
      description="Every shell command attackers typed into interactive honeypots, newest first."
      actions={
        <>
          <Text type="supporting">{formatNumber(commands.length)} commands</Text>
          <Button
            label="CSV"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            onClick={() => downloadCsv('commands.csv', commands, ['timestamp', 'sensor', 'srcIp', 'command', 'sessionId'])}
          />
        </>
      }
      rows={commands}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Command details"
      renderInspector={(row) => <CommandInspector event={row} />}
      emptyState={{ title: 'No commands captured yet', description: 'Cowrie records these as attackers type in a shell session.' }}
    />
  )
}
