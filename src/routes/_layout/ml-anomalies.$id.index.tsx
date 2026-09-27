import { SkeletonPanels } from '#/components/EntityBlocks'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AnomalyFacts } from '#/components/details/Anomaly'

const parent = getRouteApi('/_layout/ml-anomalies/$id')

export const Route = createFileRoute('/_layout/ml-anomalies/$id/')({
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  const rec = orPending(parent.useLoaderData())?.anomaly
  return rec ? <AnomalyFacts anomaly={rec} /> : <SkeletonPanels />
}
