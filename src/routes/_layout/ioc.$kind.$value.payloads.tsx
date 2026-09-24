import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/payloads')({
  component: () => <MiniTable title="Payloads downloaded in the same sessions" header="SHA-256" rows={parent.useLoaderData().payloads} entity="payload" />,
})
