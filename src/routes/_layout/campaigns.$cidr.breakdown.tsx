import { GroupBreakdown, SkeletonPanels } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/campaigns/$cidr')

export const Route = createFileRoute('/_layout/campaigns/$cidr/breakdown')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  const rec = orPending(parent.useLoaderData())?.group
  return rec ? <GroupBreakdown group={rec} /> : <SkeletonPanels />
}
