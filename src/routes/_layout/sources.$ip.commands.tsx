import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/commands')({
  component: () => <MiniTable title="Commands run" header="Command" rows={parent.useLoaderData().commands} entity="command" />,
})

