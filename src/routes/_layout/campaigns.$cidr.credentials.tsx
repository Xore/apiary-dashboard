import { MiniTable } from '#/components/DashboardBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/campaigns/$cidr')

export const Route = createFileRoute('/_layout/campaigns/$cidr/credentials')({
  component: () => {
    const d = parent.useLoaderData()
    return <MiniTable title="Credentials tried" header="user:password" rows={d.group.credentials} entity="credential" />
  },
})
