import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AlertMembers } from '#/components/details/Alert'

const parent = getRouteApi('/_layout/alerts/$key')

export const Route = createFileRoute('/_layout/alerts/$key/members')({
  component: () => <AlertMembers group={parent.useLoaderData().group} />,
})
