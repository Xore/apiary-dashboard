import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { getEntityTimeline } from '#/data/queries'

export const Route = createFileRoute('/_layout/sessions/$id/')({
  loader: ({ params }) => getEntityTimeline('session', params.id, 'all'),
  component: () => <Timeline items={Route.useLoaderData()} />,
})
