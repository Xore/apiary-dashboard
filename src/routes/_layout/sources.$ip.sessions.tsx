import { orPending } from '#/lib/pending'
import { createFileRoute } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { SessionsTable } from '#/components/EntityBlocks'
import { getSourceSessions } from '#/data/queries'


export const Route = createFileRoute('/_layout/sources/$ip/sessions')({
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getSourceSessions(params.ip, deps.range),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return (
    <Panel title="Sessions in range">
      <SessionsTable sessions={orPending(Route.useLoaderData())} />
    </Panel>
  )
}
