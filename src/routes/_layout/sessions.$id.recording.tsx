import { Link } from '@astryxdesign/core/Link'
import { HStack } from '@astryxdesign/core/Stack'
import { RecordingDownloads } from '#/components/RecordingDownloads'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { Player } from '#/components/details/Recording'
import { getReplayDetail, getSessionDetail } from '#/data/queries'

export const Route = createFileRoute('/_layout/sessions/$id/recording')({
  loader: async ({ params }) => {
    const session = await getSessionDetail(params.id)
    const shasum = session?.recordingShasum
    return shasum ? { shasum, detail: await getReplayDetail(shasum) } : null
  },
  component: SessionRecording,
})

/** The session's terminal, played back right here. */
function SessionRecording() {
  const recording = Route.useLoaderData()
  if (!recording?.detail)
    return (
      <Text type="supporting">
        No terminal recording exists for this session. Only interactive shells
        on SSH/Telnet sensors are recorded.
      </Text>
    )
  return (
    <Panel
      title="Terminal recording"
      action={
        <HStack gap={3} vAlign="center">
          <RecordingDownloads shasum={recording.shasum} />
          <Link href={`/recordings/${recording.shasum}`}>Open recording</Link>
        </HStack>
      }
    >
      <Player replay={recording.detail.replay} />
    </Panel>
  )
}
