import { pageSsr } from '#/lib/pageSsr'
import { orPending } from '#/lib/pending'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'
import { EntityLink } from '#/components/EntityLink'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/session')({ ssr: pageSsr, component: Tab, pendingComponent: Tab })

function Tab() {
  const d = orPending(parent.useLoaderData())
  const sessionId = d?.event.sessionId
  return <EventsPanel title="The rest of this session" events={d?.session} action={d && sessionId ? <EntityLink kind="session" id={sessionId}>Open session</EntityLink> : undefined} empty="This event is the whole session." />
}
