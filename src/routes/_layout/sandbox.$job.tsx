import { createFileRoute, redirect } from '@tanstack/react-router'

// Merged into the Payload entity page (epic #25).
export const Route = createFileRoute('/_layout/sandbox/$job')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/payloads/${encodeURIComponent(params.job)}/sandbox`, statusCode: 301 })
  },
})
