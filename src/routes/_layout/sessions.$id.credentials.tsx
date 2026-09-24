import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sessions/$id')

export const Route = createFileRoute('/_layout/sessions/$id/credentials')({
  component: () => <MiniTable title="Credentials tried" header="user:password" rows={parent.useLoaderData().credentials} entity="credential" />,
})
