import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/recordings/$shasum')

export const Route = createFileRoute('/_layout/recordings/$shasum/sessions')({
  component: () => (
    <MiniTable
      title="Sessions that produced this recording"
      header="Session"
      countHeader="Seconds"
      rows={parent
        .useLoaderData()
        .sessions.map((r) => ({
          id: r.session,
          label: r.session,
          count: Math.round(r.durationMs / 1000),
        }))}
      entity="session"
    />
  ),
})
