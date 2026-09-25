import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { RecordingDownloads } from '#/components/RecordingDownloads'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { getReplayDetail } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/recordings/$shasum')({
  staticData: { viewTabs: entityTabs({ label: 'Session recording views', basePath: (params) => `/recordings/${params.shasum}`, tabs: tabsFor }) },
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
        <RecordingDownloads shasum={shasum} />
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
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'playback', label: 'Playback' }, { id: 'sessions', label: 'Sessions' }, { id: 'attacker', label: 'Attacker' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const { sessions } = data
  return [
    { id: 'playback', label: 'Playback' },
    { id: 'sessions', label: 'Sessions', count: sessions.length },
    { id: 'attacker', label: 'Attacker' },
  ]
}
