import { Text } from '@astryxdesign/core/Text'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Panel } from '#/components/DashboardBlocks'
import { formatDateTime } from '#/lib/format'
import type { LlmAnalysis } from '#/data/types'
import { EntityLink } from '#/components/EntityLink'

/** Pivot back to what the analysis was generated from. Reports aggregate
 * many sources, so they have no single link. */
export function EvidenceLink({ row }: { row: LlmAnalysis }) {
  if (row.docType === 'session' && row.sessionId)
    return (
      <EntityLink kind="session" id={row.sessionId}>
        session
      </EntityLink>
    )
  if (row.docType === 'payload' && row.payloadSha256) {
    return (
      <EntityLink kind="payload" id={row.payloadSha256}>
        payload
      </EntityLink>
    )
  }
  return <Text type="supporting">—</Text>
}

/** The model's reading of one session, payload, or report. */
export function LlmSummary({ row }: { row: LlmAnalysis }) {
  return (
    <Panel title="What the model concluded">
      <Text>{row.summary || '(no summary)'}</Text>
      <MetadataList label={{ position: 'start', width: 112 }}>
        <MetadataListItem label="Analyzed">
          {formatDateTime(row.timestamp)}
        </MetadataListItem>
        <MetadataListItem label="Intent">{row.intent}</MetadataListItem>
        <MetadataListItem label="Confidence">
          {row.confidence ?? '—'}
        </MetadataListItem>
        <MetadataListItem label="Source IP">
          {row.srcIp ? <EntityLink kind="source" id={row.srcIp} /> : '—'}
        </MetadataListItem>
        <MetadataListItem label="Evidence">
          <EvidenceLink row={row} />
        </MetadataListItem>
        <MetadataListItem label="Model">
          <Text type="code">{row.model}</Text>
        </MetadataListItem>
        {row.error && (
          <MetadataListItem label="Error">{row.error}</MetadataListItem>
        )}
      </MetadataList>
      <Text type="supporting">
        AI-generated. Behavior context only, never actor attribution.
      </Text>
    </Panel>
  )
}
