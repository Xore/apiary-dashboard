import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { SeverityToken } from '#/components/SeverityToken'
import { acknowledgeAllAlerts, getAlerts, setAlertsAcknowledged } from '#/data/queries'
import type { AlertGroup } from '#/data/types'
import { formatDateTime, formatNumber, formatTime } from '#/lib/format'

type View = 'new' | 'acknowledged'

export const Route = createFileRoute('/_layout/alerts')({
  validateSearch: (search: Record<string, unknown>): { view?: View } => ({
    view: search.view === 'acknowledged' ? 'acknowledged' : undefined,
  }),
  loader: () => getAlerts(),
  component: AlertsPage,
})

function AckButton({ group }: { group: AlertGroup }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const keys = group.members.map((m) => m.key)
  return (
    <Button
      label={group.acknowledged ? 'Reopen' : group.members.length > 1 ? `Acknowledge ${group.members.length}` : 'Acknowledge'}
      size="sm"
      variant="secondary"
      isLoading={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await setAlertsAcknowledged(keys, !group.acknowledged)
          await router.invalidate()
        } finally {
          setBusy(false)
        }
      }}
    />
  )
}

const columns: TableColumn<AlertGroup>[] = [
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'kind', header: 'Kind', width: pixel(104), renderCell: (row) => <Token label={row.kind} size="sm" /> },
  {
    key: 'message',
    header: 'Message',
    width: proportional(4),
    renderCell: (row) => (
      <HStack gap={1.5} vAlign="center">
        {row.members.length > 1 && <Token label={`×${row.members.length}`} size="sm" />}
        <Text maxLines={1}>{row.message}</Text>
      </HStack>
    ),
  },
  { key: 'count', header: 'Observed', width: pixel(88), align: 'end', renderCell: (row) => formatNumber(row.count) },
  { key: 'lastSeen', header: 'Last seen', width: pixel(104), renderCell: (row) => <Text type="supporting">{formatTime(row.lastSeen)}</Text> },
  { key: 'acknowledged', header: '', width: pixel(176), renderCell: (row) => <AckButton group={row} /> },
]

function AlertInspector({ group }: { group: AlertGroup }) {
  const link = group.members.find((m) => m.link)?.link
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <SeverityToken severity={group.severity} />
        <Token label={group.kind} size="sm" />
        <Token label={group.acknowledged ? 'acknowledged' : 'new'} size="sm" color={group.acknowledged ? 'gray' : 'orange'} />
      </HStack>
      <Text>{group.message}</Text>
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="Observed">{formatNumber(group.count)}</MetadataListItem>
        <MetadataListItem label="First seen">{formatDateTime(group.firstSeen)}</MetadataListItem>
        <MetadataListItem label="Last seen">{formatDateTime(group.lastSeen)}</MetadataListItem>
        {group.members[0].lastNotified && (
          <MetadataListItem label="Notified">{formatDateTime(group.members[0].lastNotified)}</MetadataListItem>
        )}
      </MetadataList>
      <HStack gap={3} vAlign="center">
        <AckButton group={group} />
        {link && <Link href={link}>Show the events behind this alert</Link>}
      </HStack>
      {group.members.length > 1 && (
        <VStack gap={2}>
          <Heading level={3}>{`Members (${group.members.length})`}</Heading>
          <List density="compact" hasDividers>
            {group.members.map((member) => (
              <ListItem
                key={member.key}
                label={<Text type="code" maxLines={1}>{member.message.match(/\b[0-9a-f]{16,}\b/i)?.[0] ?? member.key}</Text>}
                endContent={<Text type="supporting">{formatNumber(member.count)}</Text>}
              />
            ))}
          </List>
        </VStack>
      )}
    </VStack>
  )
}

function AlertsPage() {
  const groups = Route.useLoaderData()
  const { view = 'new' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [filter, setFilter] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [acking, setAcking] = useState(false)

  const open = groups.filter((g) => !g.acknowledged)
  const acked = groups.filter((g) => g.acknowledged)
  const openRecords = open.reduce((sum, g) => sum + g.members.length, 0)
  const needle = filter.trim().toLowerCase()
  const rows = (view === 'new' ? open : acked).filter(
    (g) => !needle || g.message.toLowerCase().includes(needle) || g.members.some((m) => m.key.toLowerCase().includes(needle)),
  )

  return (
    <>
      <RecordList
        title="Alerts"
        description="Persistent alert state, cooldowns, and acknowledgments. Acknowledging moves an alert from New to Acknowledged until it is reopened."
        actions={
          <Button
            label="Acknowledge all"
            size="sm"
            variant="secondary"
            isDisabled={openRecords === 0}
            onClick={() => setConfirmOpen(true)}
          />
        }
        toolbar={
          <HStack gap={3} vAlign="center" wrap="wrap">
            <SegmentedControl
              label="Alert views"
              size="sm"
              value={view}
              onChange={(value) => void navigate({ search: { view: value === 'acknowledged' ? 'acknowledged' : undefined } })}
            >
              <SegmentedControlItem value="new" label={`New (${open.length})`} />
              <SegmentedControlItem value="acknowledged" label={`Acknowledged (${acked.length})`} />
            </SegmentedControl>
            <TextInput label="Filter alerts" isLabelHidden size="sm" width={260} placeholder="Filter by message or key" value={filter} onChange={setFilter} />
          </HStack>
        }
        rows={rows}
        columns={columns}
        getId={(row) => row.id}
        inspectorTitle="Alert details"
        renderInspector={(row) => <AlertInspector group={row} />}
        emptyState={
          view === 'new'
            ? { title: 'No new alerts', description: 'Everything open has been acknowledged.' }
            : { title: 'Nothing acknowledged yet', description: 'Acknowledged alerts collect here until reopened.' }
        }
      />
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Acknowledge every open alert?"
        description={`Moves ${formatNumber(openRecords)} open alerts to Acknowledged. Each can be reopened individually.`}
        actionLabel="Acknowledge all"
        actionVariant="primary"
        isActionLoading={acking}
        onAction={async () => {
          setAcking(true)
          try {
            await acknowledgeAllAlerts()
            await router.invalidate()
          } finally {
            setAcking(false)
            setConfirmOpen(false)
          }
        }}
      />
    </>
  )
}
