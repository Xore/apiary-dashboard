import { SkeletonPanels } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AlertOverview } from '#/components/details/Alert'

const parent = getRouteApi('/_layout/alerts/$key')

export const Route = createFileRoute('/_layout/alerts/$key/')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  const rec = orPending(parent.useLoaderData())?.group
  return rec ? <AlertOverview group={rec} /> : <SkeletonPanels />
}
