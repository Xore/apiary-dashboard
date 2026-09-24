import { createFileRoute, redirect } from '@tanstack/react-router'

// Folded into the Breakdown tab.
export const Route = createFileRoute('/_layout/sources/$ip/credentials')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/sources/${encodeURIComponent(params.ip)}/breakdown`, statusCode: 301 })
  },
})
