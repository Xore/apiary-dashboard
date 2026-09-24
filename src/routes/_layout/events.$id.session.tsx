import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { EventsPanel } from '#/components/DetailBlocks'
import { EntityLink } from '#/components/EntityLink'

const parent = getRouteApi('/_layout/events/$id')

export const Route = createFileRoute('/_layout/events/$id/session')({ component: Tab })

function Tab() {
  const d = parent.useLoaderData()
  return <EventsPanel title="The rest of this session" events={d.session} action={<EntityLink kind="session" id={d.event.sessionId}>Open session</EntityLink>} empty="This event is the whole session." />
}
