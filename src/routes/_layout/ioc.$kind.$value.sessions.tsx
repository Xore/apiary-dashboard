import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { SessionsTable } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/sessions')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return (
    <Panel title="Sessions it appeared in">
      <SessionsTable sessions={orPending(parent.useLoaderData())?.sessions} />
    </Panel>
  )
}
