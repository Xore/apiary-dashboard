import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'

const parent = getRouteApi('/_layout/llm-analysis/$id')

export const Route = createFileRoute('/_layout/llm-analysis/$id/evidence')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return (
    <EventsPanel
      title="The events the model read"
      events={orPending(parent.useLoaderData())?.events}
      showSource
      empty="This analysis aggregates many sources; it has no single set of events."
    />
  )
}
