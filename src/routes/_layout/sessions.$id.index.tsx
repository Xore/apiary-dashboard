import { VStack } from '@astryxdesign/core/Stack'
import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import { RelatedPanel } from '#/components/Related'
import { getEntityTimeline, getRelated } from '#/data/queries'

export const Route = createFileRoute('/_layout/sessions/$id/')({
  loader: async ({ params }) => {
    const [timeline, related] = await Promise.all([getEntityTimeline('session', params.id, 'all'), getRelated('session', params.id)])
    return { timeline, related }
  },
  component: SessionTimeline,
})

/** The session in order (it is a bounded thing, so the global range does
 * not apply), with what it touched above. */
function SessionTimeline() {
  const { timeline, related } = Route.useLoaderData()
  const { id } = Route.useParams()
  return (
    <VStack gap={4}>
      <RelatedPanel center={id} groups={related} />
      <Timeline items={timeline} empty="This session has no events." />
    </VStack>
  )
}
