import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { GroupBreakdown } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/clusters/$kind/$value')

export const Route = createFileRoute('/_layout/clusters/$kind/$value/breakdown')({
  component: () => <GroupBreakdown group={parent.useLoaderData().group} />,
})
