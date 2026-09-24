import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Player } from '#/components/details/Recording'

const parent = getRouteApi('/_layout/recordings/$shasum')

export const Route = createFileRoute('/_layout/recordings/$shasum/')({
  component: () => <Player replay={parent.useLoaderData().replay} />,
})
