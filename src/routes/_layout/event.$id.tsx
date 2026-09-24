import { createFileRoute, redirect } from '@tanstack/react-router'

// Moved to the Event entity page (epic #25).
export const Route = createFileRoute('/_layout/event/$id')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/events/${encodeURIComponent(params.id)}`, statusCode: 301 })
  },
})
