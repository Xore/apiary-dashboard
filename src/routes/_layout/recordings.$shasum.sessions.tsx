import { pageSsr } from '#/lib/pageSsr'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'
import { orPending } from '#/lib/pending'

const parent = getRouteApi('/_layout/recordings/$shasum')

export const Route = createFileRoute('/_layout/recordings/$shasum/sessions')({
  ssr: pageSsr,
  component: SessionsTab,
  pendingComponent: SessionsTab,
})

function SessionsTab() {
  const sessions = orPending(parent.useLoaderData())?.sessions
  return (
    <MiniTable
      title="Sessions that produced this recording"
      header="Session"
      countHeader="Seconds"
      rows={sessions?.map((r) => ({ id: r.session, label: r.session, count: Math.round(r.durationMs / 1000) }))}
      entity="session"
    />
  )
}
