import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getEntityTimeline } from '#/data/queries'
import { backendGapOf } from '#/lib/backendGap'

export const Route = createFileRoute('/_layout/campaigns/$cidr/timeline')({
  ssr: pageSsr,
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => backendGapOf(getEntityTimeline('campaign', params.cidr, deps.range)),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return <Timeline items={orPending(Route.useLoaderData())} />
}
