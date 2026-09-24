import { MiniTable } from '#/components/DashboardBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/networks')({
  component: () => {
    const a = parent.useLoaderData()
    return <MiniTable title="Networks (/26) by events" header="Prefix" rows={a.group.networks} entity="network" />
  },
})
