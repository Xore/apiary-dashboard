import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Grid } from '@astryxdesign/core/Grid'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { TimeLines } from '#/components/charts'
import { CountTable, Panel, StatTile } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { SeverityToken } from '#/components/SeverityToken'
import {
  acknowledgeAllAnomalies,
  acknowledgeAnomalies,
  getMlAnomalies,
  setAnomalyDisposition,
} from '#/data/queries'
import { DISPOSITIONS } from '#/data/types'
import type { AnomalyStatus, Disposition, MlAnomaly, ModelHealth, Severity } from '#/data/types'
import { formatClock, formatDateTime, formatNumber, formatTime } from '#/lib/format'

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']
const STATUSES: AnomalyStatus[] = ['open', 'acknowledged', ...DISPOSITIONS]

type Search = { severity?: Severity; eventType?: string; status?: AnomalyStatus }

export const Route = createFileRoute('/_layout/ml-anomalies')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    severity: SEVERITIES.includes(search.severity as Severity) ? (search.severity as Severity) : undefined,
    eventType: typeof search.eventType === 'string' && search.eventType ? search.eventType : undefined,
    status: STATUSES.includes(search.status as AnomalyStatus) ? (search.status as AnomalyStatus) : undefined,
  }),
  loader: () => getMlAnomalies(),
  component: MlAnomaliesPage,
})

const statusLabel = (status: AnomalyStatus) => status.replace('_', ' ')

const STATUS_COLOR = {
  open: 'orange',
  acknowledged: 'gray',
  false_positive: 'green',
  true_positive: 'red',
  benign_known: 'blue',
} as const satisfies Record<AnomalyStatus, string>

function StatusToken({ status }: { status: AnomalyStatus }) {
  return <Token label={statusLabel(status)} size="sm" color={STATUS_COLOR[status]} />
}

const columns: TableColumn<MlAnomaly>[] = [
  {
    key: 'timestamp',
    header: 'Time (UTC)',
    width: pixel(112),
    renderCell: (row) => (
      <HStack gap={1.5} vAlign="center">
        <Text type="supporting">{formatClock(row.timestamp)}</Text>
        {row.folded > 1 && <Token label={`×${row.folded}`} size="sm" />}
      </HStack>
    ),
  },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'compositeScore', header: 'Score', width: pixel(64), align: 'end', renderCell: (row) => row.compositeScore.toFixed(2) },
  {
    key: 'srcIp',
    header: 'Source',
    width: pixel(152),
    renderCell: (row) =>
      row.srcIp ? (
        <HStack gap={1.5} vAlign="center">
          <Link href={`/investigate/ip/${row.srcIp}`}>{row.srcIp}</Link>
          <Text type="supporting">{row.country}</Text>
        </HStack>
      ) : (
        <Text type="supporting">unattributed</Text>
      ),
  },
  {
    key: 'modelScores',
    header: 'Model scores',
    width: pixel(176),
    renderCell: (row) => (
      <Text type="supporting">
        iso {row.modelScores.isolationForest.toFixed(2)} · lstm {row.modelScores.lstmAe.toFixed(2)} · hbos{' '}
        {row.modelScores.hbos.toFixed(2)}
      </Text>
    ),
  },
  { key: 'explanation', header: 'Explanation', width: proportional(2) },
  { key: 'status', header: 'Status', width: pixel(136), renderCell: (row) => <StatusToken status={row.status} /> },
]

const healthColumns: TableColumn<ModelHealth>[] = [
  { key: 'model', header: 'Model', width: pixel(152), renderCell: (row) => <Text type="code">{row.model}</Text> },
  {
    key: 'accepted',
    header: 'Last retrain',
    width: pixel(184),
    renderCell: (row) => (
      <HStack gap={1.5} vAlign="center">
        <StatusDot variant={row.accepted ? 'success' : 'warning'} label={row.accepted ? 'accepted' : 'rejected'} />
        <Text>{row.accepted ? 'accepted' : 'rejected'}</Text>
        <Text type="supporting">{formatTime(row.timestamp)}</Text>
      </HStack>
    ),
  },
  {
    key: 'anomalyRateNew',
    header: 'Anomaly rate',
    width: pixel(140),
    renderCell: (row) =>
      `${(row.anomalyRatePrevious * 100).toFixed(1)}% → ${(row.anomalyRateNew * 100).toFixed(1)}%`,
  },
  { key: 'trainSamples', header: 'Samples', width: pixel(96), align: 'end', renderCell: (row) => formatNumber(row.trainSamples) },
  { key: 'reason', header: 'Reason', width: proportional(2) },
]

function AnomalyInspector({ anomaly }: { anomaly: MlAnomaly }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [verdict, setVerdict] = useState<Disposition>('true_positive')
  const [reason, setReason] = useState('')
  const isDisposed = (DISPOSITIONS as readonly string[]).includes(anomaly.status)
  const run = async (write: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await write()
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }
  // A folded row stands for several anomalies; the mock keeps them as one.
  const ids = [anomaly.id]

  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <SeverityToken severity={anomaly.severity} />
        <StatusToken status={anomaly.status} />
        <Text type="supporting">score {anomaly.compositeScore.toFixed(2)}</Text>
      </HStack>
      <Text>{anomaly.explanation}</Text>

      <MetadataList label={{ position: 'start', width: 128 }}>
        <MetadataListItem label="Time">{formatDateTime(anomaly.timestamp)}</MetadataListItem>
        <MetadataListItem label="Source">{anomaly.srcIp ?? 'unattributed'}</MetadataListItem>
        <MetadataListItem label="Event type">{anomaly.eventType}</MetadataListItem>
        <MetadataListItem label="Dst port / proto">{`${anomaly.dstPort} / ${anomaly.proto}`}</MetadataListItem>
        <MetadataListItem label="Sensor">{anomaly.sensor}</MetadataListItem>
        <MetadataListItem label="Source index">
          <Text type="code">{anomaly.sourceIndex}</Text>
        </MetadataListItem>
        <MetadataListItem label="Source event">
          <Link href={`/event/${anomaly.sourceEventId}`}>{anomaly.sourceEventId}</Link>
        </MetadataListItem>
        <MetadataListItem label="Threshold">{anomaly.thresholdAtScoring.toFixed(2)}</MetadataListItem>
        <MetadataListItem label="Model state">{anomaly.modelState ?? 'no full detector trio promoted'}</MetadataListItem>
        {anomaly.folded > 1 && (
          <MetadataListItem label="Folded">{`${anomaly.folded} anomalies from this address in the same second`}</MetadataListItem>
        )}
        {anomaly.dispositionReason && <MetadataListItem label="Verdict reason">{anomaly.dispositionReason}</MetadataListItem>}
      </MetadataList>

      <Divider />

      <VStack gap={3}>
        <Heading level={3}>Triage</Heading>
        {anomaly.status === 'open' && (
          <Button label="Acknowledge" variant="secondary" size="sm" isLoading={busy} onClick={() => run(() => acknowledgeAnomalies(ids))} />
        )}
        <Selector
          label="Disposition"
          value={verdict}
          onChange={(value) => setVerdict(value as Disposition)}
          options={DISPOSITIONS.map((value) => ({ value, label: statusLabel(value) }))}
        />
        <TextInput
          label="Reason"
          description="Kept next to the score for the labelled training corpus."
          value={reason}
          onChange={setReason}
        />
        <HStack gap={2}>
          <Button
            label={isDisposed ? `Change to ${statusLabel(verdict)}` : 'Record disposition'}
            size="sm"
            isLoading={busy}
            onClick={() => run(() => setAnomalyDisposition(ids, verdict, reason))}
          />
          {isDisposed && (
            <Button label="Retract" variant="secondary" size="sm" isDisabled={busy} onClick={() => run(() => setAnomalyDisposition(ids, 'open', ''))} />
          )}
        </HStack>
      </VStack>
    </VStack>
  )
}

function MlAnomaliesPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [acking, setAcking] = useState(false)

  const rows = data.anomalies.filter(
    (row) =>
      (!search.severity || row.severity === search.severity) &&
      (!search.eventType || row.eventType === search.eventType) &&
      (!search.status || row.status === search.status),
  )
  const setFilter = (patch: Search) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  const severityCount = (severity: Severity) => data.bySeverity.find((row) => row.label === severity)?.count ?? 0

  return (
    <>
      <RecordList
        title="ML anomalies"
        description="Statistical outliers across sensor traffic: isolation forest, HBOS, and LSTM autoencoder scores combined into one score per event."
        actions={
          <Button
            label="Acknowledge all open"
            variant="secondary"
            size="sm"
            isDisabled={data.openBacklog === 0}
            onClick={() => setConfirmOpen(true)}
          />
        }
        summary={
          <VStack gap={4}>
            <Grid columns={{ minWidth: 160, repeat: 'fit' }} gap={4}>
              <StatTile label="Anomalies, 24h" value={data.total24h} />
              <StatTile label="Open (all time)" value={data.openBacklog} href="/ml-anomalies?status=open" />
              {SEVERITIES.map((severity) => (
                <StatTile
                  key={severity}
                  label={severity}
                  value={severityCount(severity)}
                  caption="last 24h"
                  href={`/ml-anomalies?severity=${severity}`}
                />
              ))}
            </Grid>
            <Grid columns={{ minWidth: 380, repeat: 'fit' }} gap={4}>
              <Panel title="Model scores over time">
                <TimeLines
                  data={data.scoreTimeline}
                  series={[
                    { key: 'isolationForest', label: 'Isolation forest' },
                    { key: 'lstmAe', label: 'LSTM autoencoder' },
                    { key: 'hbos', label: 'HBOS' },
                  ]}
                />
              </Panel>
              <Panel title="Top source IPs, 24h">
                <CountTable header="Source IP" rows={data.topSources} countHeader="Anomalies" />
              </Panel>
            </Grid>
            <Panel title="Model health">
              <Table data={data.modelHealth} columns={healthColumns} idKey="model" density="compact" />
            </Panel>
          </VStack>
        }
        toolbar={
          <HStack gap={3} wrap="wrap">
            <Selector
              label="Severity"
              isLabelHidden
              size="sm"
              placeholder="All severities"
              hasClear
              value={search.severity ?? null}
              onChange={(value) => setFilter({ severity: (value ?? undefined) as Severity | undefined })}
              options={SEVERITIES}
            />
            <Selector
              label="Event type"
              isLabelHidden
              size="sm"
              placeholder="All event types"
              hasClear
              value={search.eventType ?? null}
              onChange={(value) => setFilter({ eventType: value ?? undefined })}
              options={data.eventTypes}
            />
            <Selector
              label="Status"
              isLabelHidden
              size="sm"
              placeholder="All statuses"
              hasClear
              value={search.status ?? null}
              onChange={(value) => setFilter({ status: (value ?? undefined) as AnomalyStatus | undefined })}
              options={STATUSES.map((value) => ({ value, label: statusLabel(value) }))}
            />
            <Text type="supporting">
              {formatNumber(rows.length)} of {formatNumber(data.anomalies.length)} anomalies
            </Text>
          </HStack>
        }
        rows={rows}
        columns={columns}
        getId={(row) => row.id}
        inspectorTitle="Anomaly details"
        renderInspector={(row) => <AnomalyInspector anomaly={row} />}
        emptyState={{
          title: 'No anomalies match',
          description: 'Clear a filter, or wait for ml-worker to score new traffic.',
        }}
      />
      <AlertDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Acknowledge all open anomalies?"
        description={`Marks ${formatNumber(data.openBacklog)} open anomalies as seen without a verdict. You can still record a disposition afterwards.`}
        actionLabel="Acknowledge all"
        actionVariant="primary"
        isActionLoading={acking}
        onAction={async () => {
          setAcking(true)
          try {
            await acknowledgeAllAnomalies()
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
