import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { entityHref } from '#/lib/entities'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getCommands } from '#/data/queries'
import type { HoneypotEvent } from '#/data/types'
import { apiHref } from '#/lib/apiHref'
import { formatClock, formatNumber } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'
import { ZoneHeader } from '#/components/ZoneHeader'

export const Route = createFileRoute('/_layout/commands')({
  loader: () => getCommands(),
  component: CommandsPage,
})

const columns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: <ZoneHeader label="Seen" />, width: pixel(128), renderCell: (row) => <Text type="supporting">{formatClock(row.timestamp)}</Text> },
  { key: 'sensor', header: 'Sensor', width: pixel(152), renderCell: (row) => <Token label={row.sensor} size="sm" /> },
  { key: 'srcIp', header: 'Source IP', width: pixel(136), renderCell: (row) => <EntityLink kind="source" id={row.srcIp} /> },
  { key: 'command', header: 'Command', width: proportional(4), renderCell: (row) => <Text type="code">{row.command ?? row.summary}</Text> },
]


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
            href={apiHref('/api/export/commands.csv')}
          />
        </>
      }
      rows={commands}
      columns={columns}
      getHref={(row) => entityHref('event', row.id)!}
      getId={(row) => row.id}
      emptyState={{ title: 'No commands captured yet', description: 'Cowrie records these as attackers type in a shell session.' }}
    />
  )
}
