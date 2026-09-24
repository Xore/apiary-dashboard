import { Button } from '@astryxdesign/core/Button'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { getReplayDetail } from '#/data/queries'
import { downloadJson } from '#/lib/export'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/recordings/$shasum')({
  loader: async ({ params }) => {
    const detail = await getReplayDetail(params.shasum)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => (
    <NotFound
      title="Session recording"
      description="No recording found for this id."
    />
  ),
  component: RecordingLayout,
})

/** One terminal recording, shared by every session that produced the same
 * bytes, since bot traffic repeats itself. */
function RecordingLayout() {
  const { replay, sessions, attacker } = Route.useLoaderData()
  const { shasum } = Route.useParams()
  return (
    <EntityFrame
      kind="Session recording"
      title={`${shasum.slice(0, 16)}…`}
      basePath={`/recordings/${shasum}`}
      actions={
        <Button
          label="Download (.cast)"
          size="sm"
          variant="secondary"
          onClick={() =>
            downloadJson(`${shasum.slice(0, 12)}.cast.json`, {
              version: 2,
              duration: replay.durationSeconds,
              transcript: replay.transcript,
            })
          }
        />
      }
      facts={[
        {
          label: 'Duration',
          value: `${formatNumber(replay.durationSeconds)} s`,
        },
        { label: 'Sessions', value: formatNumber(sessions.length) },
        {
          label: 'First closed',
          value: sessions[0] ? formatDateTime(sessions[0].when) : '—',
        },
        {
          label: 'Source',
          value: attacker ? (
            <EntityLink kind="source" id={attacker.ip} />
          ) : (
            'unattributed'
          ),
        },
      ]}
      tabs={[
        { id: 'playback', label: 'Playback' },
        { id: 'sessions', label: 'Sessions', count: sessions.length },
        { id: 'attacker', label: 'Attacker' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
