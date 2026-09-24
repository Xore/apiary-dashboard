import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/alerts')({
  component: () => <MiniTable title="IDS alerts" header="Signature" rows={parent.useLoaderData().alerts} entity="signature" />,
})

