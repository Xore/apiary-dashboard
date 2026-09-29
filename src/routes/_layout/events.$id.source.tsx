import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'
import { EntityLink } from '#/components/EntityLink'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/source')({ ssr: pageSsr, component: Tab, pendingComponent: Tab })

function Tab() {
  const d = orPending(parent.useLoaderData())
  return <EventsPanel title="What else this source did" events={d?.source} action={d && <EntityLink kind="source" id={d.event.srcIp}>Open source IP</EntityLink>} empty="Nothing else from this address." />
}
