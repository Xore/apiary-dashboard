import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'

const parent = getRouteApi('/_layout/agent-campaigns/$id')

export const Route = createFileRoute('/_layout/agent-campaigns/$id/events')({
  ssr: pageSsr,
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return (
    <EventsPanel
      title="Sensor events in this campaign"
      events={orPending(parent.useLoaderData())?.events}
      showSource
      empty="The events sit in agent-sensor indices; open them from the evidence timeline."
    />
  )
}
