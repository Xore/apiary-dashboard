import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/payloads')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return <MiniTable title="Payloads delivered" header="SHA-256" rows={orPending(parent.useLoaderData())?.payloads} entity="payload" />
}
