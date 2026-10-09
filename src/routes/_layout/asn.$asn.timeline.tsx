import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getEntityTimeline } from '#/data/queries'
import { unavailableOf } from '#/lib/unavailable'

export const Route = createFileRoute('/_layout/asn/$asn/timeline')({
  ssr: pageSsr,
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => unavailableOf(getEntityTimeline('asn', params.asn, deps.range)),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return <Timeline items={orPending(Route.useLoaderData())} />
}
