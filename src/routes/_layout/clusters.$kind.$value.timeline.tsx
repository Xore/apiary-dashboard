import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getEntityTimeline } from '#/data/queries'

export const Route = createFileRoute('/_layout/clusters/$kind/$value/timeline')({
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getEntityTimeline('cluster', `${params.kind}:${params.value}`, deps.range),
  component: () => <Timeline items={Route.useLoaderData()} />,
})
