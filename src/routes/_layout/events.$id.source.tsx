import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'
import { EntityLink } from '#/components/EntityLink'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/source')({ component: Tab })

function Tab() {
  const d = parent.useLoaderData()
  return <EventsPanel title="What else this source did" events={d.source} action={<EntityLink kind="source" id={d.event.srcIp}>Open source IP</EntityLink>} empty="Nothing else from this address." />
}
