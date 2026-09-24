import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getSourceTimeline } from '#/data/queries'


export const Route = createFileRoute('/_layout/sources/$ip/timeline')({
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ params, deps }) => getSourceTimeline(params.ip, deps.range),
  component: () => <Timeline items={Route.useLoaderData()} />,
})
