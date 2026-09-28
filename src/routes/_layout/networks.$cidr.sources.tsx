import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/sources')({
  ssr: pageSsr,
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const n = orPending(parent.useLoaderData())
    return (
      <Panel title="Addresses in this prefix">
        <SourcesTable sources={n?.group.members} />
      </Panel>
    )
  }
