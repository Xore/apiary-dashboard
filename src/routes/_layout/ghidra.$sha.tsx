import { createFileRoute, redirect } from '@tanstack/react-router'

// Merged into the Payload entity page (epic #25).
export const Route = createFileRoute('/_layout/ghidra/$sha')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/payloads/${encodeURIComponent(params.sha)}/ghidra`, statusCode: 301 })
  },
})
