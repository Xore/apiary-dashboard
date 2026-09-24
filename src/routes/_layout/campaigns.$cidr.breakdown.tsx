import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { GroupBreakdown } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/campaigns/$cidr')

export const Route = createFileRoute('/_layout/campaigns/$cidr/breakdown')({
  component: () => <GroupBreakdown group={parent.useLoaderData().group} />,
})
