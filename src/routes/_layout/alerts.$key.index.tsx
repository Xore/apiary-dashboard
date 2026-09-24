import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AlertOverview } from '#/components/details/Alert'

const parent = getRouteApi('/_layout/alerts/$key')

export const Route = createFileRoute('/_layout/alerts/$key/')({
  component: () => <AlertOverview group={parent.useLoaderData().group} />,
})
