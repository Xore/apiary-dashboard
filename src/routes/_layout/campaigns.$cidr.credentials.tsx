import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { MiniTable } from '#/components/DashboardBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/campaigns/$cidr')

export const Route = createFileRoute('/_layout/campaigns/$cidr/credentials')({
  ssr: pageSsr,
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
    const d = orPending(parent.useLoaderData())
    return <MiniTable title="Credentials tried" header="user:password" rows={d?.group.credentials} entity="credential" />
  }
