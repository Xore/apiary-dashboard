import { orPending } from '#/lib/pending'
import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getEntityTimeline } from '#/data/queries'

export const Route = createFileRoute('/_layout/payloads/$hash/timeline')({
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getEntityTimeline('payload', params.hash, deps.range),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return <Timeline items={orPending(Route.useLoaderData())} />
}
