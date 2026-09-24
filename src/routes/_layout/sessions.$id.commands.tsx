import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sessions/$id')

export const Route = createFileRoute('/_layout/sessions/$id/commands')({
  component: () => <MiniTable title="Commands run" header="Command" rows={parent.useLoaderData().commands} entity="command" />,
})
