import { GroupOverview } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/')({
  component: () => {
    const a = parent.useLoaderData()
    return <GroupOverview group={a.group} base={`/asn/${encodeURIComponent(a.asn)}`} sourcesTab="sources" eventsTab="events" />
  },
})
