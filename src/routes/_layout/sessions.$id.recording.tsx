import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sessions/$id')

export const Route = createFileRoute('/_layout/sessions/$id/recording')({ component: SessionRecording })

function SessionRecording() {
  const s = parent.useLoaderData()
  return (
    <Panel title="Terminal recording">
      {s.recordingShasum ? (
        <VStack gap={2}>
          <Text color="secondary">The sensor recorded this session's terminal output byte for byte.</Text>
          <Text type="code">{s.recordingShasum}</Text>
          <Link href={`/tty-replay/${s.recordingShasum}`}>Open the replay</Link>
        </VStack>
      ) : (
        <Text type="supporting">No terminal recording exists for this session. Only interactive shells on SSH/Telnet sensors are recorded.</Text>
      )}
    </Panel>
  )
}
