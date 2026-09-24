import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/payloads')({
  component: () => <MiniTable title="Payloads delivered" header="SHA-256" rows={parent.useLoaderData().payloads} entity="payload" />,
})
