import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/payloads')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return <MiniTable title="Payloads downloaded in the same sessions" header="SHA-256" rows={orPending(parent.useLoaderData())?.payloads} entity="payload" />
}
