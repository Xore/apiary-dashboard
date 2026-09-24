import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { GroupBreakdown } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/breakdown')({
  component: () => <GroupBreakdown group={parent.useLoaderData().group} />,
})
