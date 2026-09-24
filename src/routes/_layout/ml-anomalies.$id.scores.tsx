import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/ml-anomalies/$id')

export const Route = createFileRoute('/_layout/ml-anomalies/$id/scores')({
  component: AnomalyScores,
})

/** Each detector's say in the composite score. */
function AnomalyScores() {
  const { anomaly: a } = parent.useLoaderData()
  const rows = [
    { label: 'Isolation forest', value: a.modelScores.isolationForest },
    { label: 'LSTM autoencoder', value: a.modelScores.lstmAe },
    { label: 'HBOS', value: a.modelScores.hbos },
  ]
  return (
    <Panel title="Detector scores">
      <VStack gap={2}>
        <Text color="secondary">{`Composite ${a.compositeScore.toFixed(2)} against a threshold of ${a.thresholdAtScoring.toFixed(2)} at scoring time.`}</Text>
        <MetadataList label={{ position: 'start', width: 160 }}>
          {rows.map((r) => (
            <MetadataListItem key={r.label} label={r.label}>
              {`${r.value.toFixed(2)}${r.value >= a.thresholdAtScoring ? ' · above threshold' : ''}`}
            </MetadataListItem>
          ))}
        </MetadataList>
        <Text type="supporting">
          {a.modelState ??
            'No full detector trio was promoted when this was scored.'}
        </Text>
      </VStack>
    </Panel>
  )
}
