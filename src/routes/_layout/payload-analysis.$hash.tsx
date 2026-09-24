import { createFileRoute, redirect } from '@tanstack/react-router'

// Merged into the Payload entity page (epic #25).
export const Route = createFileRoute('/_layout/payload-analysis/$hash')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/payloads/${encodeURIComponent(params.hash)}`, statusCode: 301 })
  },
})
