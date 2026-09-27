import { SkeletonPanels } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { TechniquesPanel } from '#/components/DetailBlocks'

const parent = getRouteApi('/_layout/sessions/$id')

export const Route = createFileRoute('/_layout/sessions/$id/attck')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  const rec = orPending(parent.useLoaderData())?.techniques
  return rec ? <TechniquesPanel techniques={rec} /> : <SkeletonPanels />
}
