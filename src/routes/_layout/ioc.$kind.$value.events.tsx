import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RangeEvents } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/events')({
  component: () => <RangeEvents events={parent.useLoaderData().events} />,
})
