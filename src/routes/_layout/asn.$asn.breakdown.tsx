import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { GroupBreakdown } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/breakdown')({
  component: () => <GroupBreakdown group={parent.useLoaderData().group} />,
})
