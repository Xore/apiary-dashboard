import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { SeverityToken } from '#/components/SeverityToken'
import { getLlmAnalyses, semanticSearch } from '#/data/queries'
import type { LlmAnalysis, SemanticHit, SemanticSearchResult } from '#/data/types'
import { formatDateTime, formatTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

export const Route = createFileRoute('/_layout/llm-analysis')({
  loader: () => getLlmAnalyses(),
  component: LlmAnalysisPage,
})

/** Pivot back to what the analysis was generated from. Reports aggregate
 * many sources, so they have no single link. */
function EvidenceLink({ row }: { row: LlmAnalysis }) {
  if (row.docType === 'session' && row.sessionId) return <EntityLink kind="session" id={row.sessionId}>session</EntityLink>
  if (row.docType === 'payload' && row.payloadSha256) {
    return <EntityLink kind="payload" id={row.payloadSha256}>payload</EntityLink>
  }
  return <Text type="supporting">—</Text>
}

const columns: TableColumn<LlmAnalysis>[] = [
  { key: 'timestamp', header: 'Analyzed', width: pixel(96), renderCell: (row) => <Text type="supporting">{formatTime(row.timestamp)}</Text> },
  {
    key: 'docType',
    header: 'Type',
    width: pixel(168),
    renderCell: (row) => (
      <HStack gap={1} vAlign="center">
        <Token label={row.docType} size="sm" color="blue" />
        <Token label="AI-generated" size="sm" />
      </HStack>
    ),
  },
  { key: 'severity', header: 'Severity (AI)', width: pixel(104), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'intent', header: 'Intent', width: pixel(136) },
  {
    key: 'summary',
    header: 'Summary',
    width: proportional(3),
    renderCell: (row) => (row.summary ? row.summary : <Text type="supporting">(no summary)</Text>),
  },
  { key: 'sessionId', header: 'Evidence', width: pixel(88), renderCell: (row) => <EvidenceLink row={row} /> },
]

const hitColumns: TableColumn<SemanticHit>[] = [
  { key: 'score', header: 'Score', width: pixel(72), align: 'end', renderCell: (row) => row.score.toFixed(3) },
  { key: 'severity', header: 'Severity', width: pixel(96), renderCell: (row) => <SeverityToken severity={row.severity} /> },
  { key: 'summary', header: 'Summary', width: proportional(3) },
  {
    key: 'sessionId',
    header: 'Session',
    width: pixel(152),
    renderCell: (row) => (row.sessionId ? <EntityLink kind="session" id={row.sessionId} /> : '—'),
  },
]

function SemanticSearch() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [result, setResult] = useState<SemanticSearchResult | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const q = query.trim()
    if (!q || busy) return
    setBusy(true)
    try {
      setResult(await semanticSearch(q))
      setSubmitted(q)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Semantic search">
      <Text color="secondary">
        Search session summaries by meaning rather than keywords. Results are AI-generated and unverified.
      </Text>
      <HStack gap={2} vAlign="end">
        <StackItem size="fill">
          <TextInput
            label="Semantic search query"
            isLabelHidden
            placeholder='e.g. "attacker installed a cryptominer via wget"'
            value={query}
            onChange={setQuery}
            onEnter={submit}
          />
        </StackItem>
        <Button label="Run search" variant="secondary" isLoading={busy} isDisabled={!query.trim()} onClick={submit} />
      </HStack>
      {result && !result.available && <Text color="secondary">{result.reason}</Text>}
      {result?.available && result.hits.length === 0 && (
        <EmptyState isCompact title="No semantic matches" description={`Nothing close to “${submitted}”.`} />
      )}
      {result?.available && result.hits.length > 0 && (
        <Table data={result.hits} columns={hitColumns} idKey="id" density="compact" />
      )}
    </Panel>
  )
}

function AnalysisInspector({ row }: { row: LlmAnalysis }) {
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Token label={row.docType} size="sm" color="blue" />
        <SeverityToken severity={row.severity} />
        <Token label="AI-generated" size="sm" />
      </HStack>
      <Text>{row.summary || '(no summary)'}</Text>
      <MetadataList label={{ position: 'start', width: 112 }}>
        <MetadataListItem label="Analyzed">{formatDateTime(row.timestamp)}</MetadataListItem>
        <MetadataListItem label="Intent">{row.intent}</MetadataListItem>
        <MetadataListItem label="Confidence">{row.confidence ?? '—'}</MetadataListItem>
        <MetadataListItem label="Behaviors">{row.behaviors.length ? row.behaviors.join(', ') : '—'}</MetadataListItem>
        <MetadataListItem label="Source IP">{row.srcIp ?? '—'}</MetadataListItem>
        <MetadataListItem label="Session">{row.sessionId ?? '—'}</MetadataListItem>
        <MetadataListItem label="Evidence">
          <EvidenceLink row={row} />
        </MetadataListItem>
        <MetadataListItem label="Model">
          <Text type="code">{row.model}</Text>
        </MetadataListItem>
        {row.error && <MetadataListItem label="Error">{row.error}</MetadataListItem>}
      </MetadataList>
    </VStack>
  )
}

function LlmAnalysisPage() {
  const rows = Route.useLoaderData()
  return (
    <RecordList
      title="LLM analysis"
      description="Model-annotated sessions, payloads, and reports. Every judgment here is AI-guessed and unverified until a human confirms it."
      actions={<Text type="supporting">{rows.length} analyses</Text>}
      summary={
        <VStack gap={4}>
          <SemanticSearch />
          <Banner
            status="warning"
            title="AI-generated content"
            description="Every row below is model output about attacker-controlled input. Review it before treating it as fact."
          />
        </VStack>
      }
      rows={rows}
      columns={columns}
      getId={(row) => row.id}
      inspectorTitle="Analysis details"
      renderInspector={(row) => <AnalysisInspector row={row} />}
      emptyState={{ title: 'No LLM analysis documents yet', description: 'llm-worker writes one per analysed event batch.' }}
    />
  )
}
