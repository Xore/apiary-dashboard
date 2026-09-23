import { useState } from 'react'
import { Heading, Text } from '@astryxdesign/core/Text'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Selector } from '@astryxdesign/core/Selector'
import { VStack } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { RecordList } from '#/components/RecordList'
import { getProblemReports, setProblemStatus } from '#/data/queries'
import type { ProblemReport, ProblemStatus } from '#/data/types'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/problem-reports')({
  loader: () => getProblemReports(),
  component: ProblemReportsPage,
})

const STATUS_COLOR = { open: 'orange', triaged: 'blue', fixed: 'green', wontfix: 'gray' } as const satisfies Record<ProblemStatus, string>

const columns: TableColumn<ProblemReport>[] = [
  { key: 'submittedAt', header: 'Submitted', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.submittedAt)}</Text> },
  { key: 'status', header: 'Status', width: pixel(96), renderCell: (row) => <Token size="sm" color={STATUS_COLOR[row.status]} label={row.status} /> },
  { key: 'page', header: 'Page', width: pixel(184), renderCell: (row) => <Text type="code" maxLines={1}>{row.page}</Text> },
  { key: 'actual', header: 'What happened', width: proportional(3) },
  { key: 'consoleErrors', header: 'Console', width: pixel(80), align: 'end', renderCell: (row) => row.consoleErrors.length || '—' },
  { key: 'networkFailures', header: 'Network', width: pixel(80), align: 'end', renderCell: (row) => row.networkFailures.length || '—' },
]

function ReportInspector({ report }: { report: ProblemReport }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <VStack gap={4}>
      <Selector
        label="Status"
        value={report.status}
        isDisabled={busy}
        onChange={async (status) => {
          setBusy(true)
          try {
            await setProblemStatus(report.id, status as ProblemStatus)
            await router.invalidate()
          } finally {
            setBusy(false)
          }
        }}
        options={['open', 'triaged', 'fixed', 'wontfix']}
      />
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="Page">
          <Text type="code">{report.page}</Text>
        </MetadataListItem>
        <MetadataListItem label="Expected">{report.expected}</MetadataListItem>
        <MetadataListItem label="Actual">{report.actual}</MetadataListItem>
        <MetadataListItem label="By">{report.submittedBy}</MetadataListItem>
        <MetadataListItem label="Browser">{report.userAgent}</MetadataListItem>
        <MetadataListItem label="Snapshot">{report.hasSnapshot ? 'DOM snapshot attached' : 'none'}</MetadataListItem>
      </MetadataList>
      <VStack gap={2}>
        <Heading level={3}>Action trail</Heading>
        <List density="compact" hasDividers>
          {report.actionTrail.map((step, i) => (
            <ListItem key={i} label={`${i + 1}. ${step}`} />
          ))}
        </List>
      </VStack>
      {[...report.consoleErrors, ...report.networkFailures].length > 0 && (
        <VStack gap={2}>
          <Heading level={3}>Errors</Heading>
          {[...report.consoleErrors, ...report.networkFailures].map((line) => (
            <Text key={line} type="code">
              {line}
            </Text>
          ))}
        </VStack>
      )}
      <VStack gap={2}>
        <Heading level={3}>API calls</Heading>
        {report.apiCalls.map((call) => (
          <Text key={`${call.method}${call.path}`} type="code">{`${call.status} ${call.method} ${call.path}`}</Text>
        ))}
      </VStack>
    </VStack>
  )
}

function ProblemReportsPage() {
  const reports = Route.useLoaderData()
  return (
    <RecordList
      title="Problem reports"
      description="Operator-submitted UI problem reports, with the action trail and request context captured at submit time. Admin only: captures can include a DOM snapshot."
      actions={<Text type="supporting">{reports.filter((r) => r.status === 'open').length} open</Text>}
      rows={reports}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Report details"
      renderInspector={(row) => <ReportInspector key={row.id} report={row} />}
      emptyState={{ title: 'No problem reports', description: 'Reports submitted from any page land here.' }}
    />
  )
}
