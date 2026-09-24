import { Grid } from '@astryxdesign/core/Grid'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CountTable, Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sensors/$sensor')

export const Route = createFileRoute('/_layout/sensors/$sensor/leaderboards')({ component: SensorLeaderboards })

/** This sensor's own leaderboards: the fields that mean something for its protocols. */
function SensorLeaderboards() {
  const { detail } = parent.useLoaderData()
  if (detail.topLists.length === 0) return <Text type="supporting">This sensor type has no leaderboards of its own.</Text>
  return (
    <Panel title="What they asked it for">
      <Grid columns={{ minWidth: 280, repeat: 'fit' }} gap={4}>
        {detail.topLists.map((list) =>
          list.rows.length ? (
            <CountTable key={list.label} header={list.label} rows={list.rows} countHeader="Count" isCode />
          ) : (
            <VStack key={list.label} gap={1}>
              <Text weight="semibold">{list.label}</Text>
              <Text type="supporting">Nothing recorded yet.</Text>
            </VStack>
          ),
        )}
      </Grid>
    </Panel>
  )
}
