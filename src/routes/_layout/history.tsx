import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { entityHref } from '#/lib/entities'
import { createFileRoute } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { searchHistory } from '#/data/queries'
import type { HoneypotEvent } from '#/data/types'
import { apiHref } from '#/lib/apiHref'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/history')({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
  }),
  loaderDeps: ({ search }) => ({ q: search.q ?? '' }),
  loader: ({ deps }) => searchHistory(deps.q),
  component: HistoryPage,
})

const EXAMPLES = ['honeypot.event:command.input', 'sensor:cowrie AND username:root', 'protocol:smb AND country:CN']

const columns: TableColumn<HoneypotEvent>[] = [
  { key: 'timestamp', header: 'Time', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.timestamp)}</Text> },
  { key: 'sensor', header: 'Sensor', width: pixel(152), renderCell: (row) => <Token label={row.sensor} size="sm" /> },
  { key: 'srcIp', header: 'Source IP', width: pixel(136) },
  { key: 'dstPort', header: 'Port', width: pixel(64), align: 'end', renderCell: (row) => `:${row.dstPort}` },
  { key: 'summary', header: 'Detail', width: proportional(3), renderCell: (row) => <Text type="code">{row.summary}</Text> },
]

function HistoryPage() {
  const rows = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [draft, setDraft] = useState(q ?? '')
  const run = (query: string) => void navigate({ search: { q: query.trim() || undefined } })

  return (
    <RecordList
      title="Event history"
      description="Raw search across the full event archive: Lucene-style field:value terms joined with AND, 90-day window, exportable."
      actions={
        <>
          <Text type="supporting">{formatNumber(rows.length)} matches{rows.length === 500 ? ' (capped)' : ''}</Text>
          <Button
            label="JSON"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            href={apiHref('/api/export/history.json', { q })}
          />
        </>
      }
      toolbar={
        <VStack gap={2}>
          <HStack gap={2} vAlign="end">
            <StackItem size="fill">
              <TextInput
                label="History search query"
                isLabelHidden
                placeholder="source.ip:203.0.113.7 AND honeypot.event:login.failed"
                value={draft}
                onChange={setDraft}
                onEnter={() => run(draft)}
              />
            </StackItem>
            <Button label="Search" onClick={() => run(draft)} />
          </HStack>
          <HStack gap={1.5} wrap="wrap" vAlign="center">
            <Text type="supporting">Examples:</Text>
            {EXAMPLES.map((example) => (
              <Token
                key={example}
                size="sm"
                label={example}
                onClick={() => {
                  setDraft(example)
                  run(example)
                }}
              />
            ))}
          </HStack>
        </VStack>
      }
      rows={rows}
      columns={columns}
      getHref={(row) => entityHref('event', row.id)!}
      getId={(row) => row.id}
      emptyState={{ title: 'No matches', description: 'Check the field names, or loosen the query.' }}
    />
  )
}
