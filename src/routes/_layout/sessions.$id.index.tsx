import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Timeline } from '#/components/EntityBlocks'
import type { TimelineItem } from '#/data/types'

const parent = getRouteApi('/_layout/sessions/$id')

export const Route = createFileRoute('/_layout/sessions/$id/')({ component: SessionTimeline })

/** The session in order, every event linking to its own page. */
function SessionTimeline() {
  const s = parent.useLoaderData()
  const items: TimelineItem[] = s.events.map((e) => ({
    id: e.id,
    at: e.timestamp,
    kind: 'event',
    title: e.summary,
    detail: `${e.sensor} · ${e.type} · ${e.protocol.toUpperCase()} ${e.dstPort}`,
    severity: e.severity,
    href: `/events/${e.id}`,
  }))
  return <Timeline items={items} empty="This session has no events." />
}
