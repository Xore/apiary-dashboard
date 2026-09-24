import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getEntityTimeline } from '#/data/queries'

export const Route = createFileRoute('/_layout/ioc/$kind/$value/timeline')({
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getEntityTimeline('ioc', `${params.kind}:${params.value}`, deps.range),
  component: () => <Timeline items={Route.useLoaderData()} />,
})
