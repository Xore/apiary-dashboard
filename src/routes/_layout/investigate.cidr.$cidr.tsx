import { createFileRoute, redirect } from '@tanstack/react-router'

// Moved to the Network entity page (epic #25).
export const Route = createFileRoute('/_layout/investigate/cidr/$cidr')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/networks/${encodeURIComponent(params.cidr)}`, statusCode: 301 })
  },
})
