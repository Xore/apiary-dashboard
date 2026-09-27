import { orPending } from '#/lib/pending'
import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getEntityTimeline } from '#/data/queries'

export const Route = createFileRoute('/_layout/identities/$id/timeline')({
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getEntityTimeline('identity', params.id, deps.range),
  component: TabView,
  pendingComponent: TabView,
})

function TabView() {
  return <Timeline items={orPending(Route.useLoaderData())} />
}
