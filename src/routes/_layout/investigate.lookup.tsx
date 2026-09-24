import { createFileRoute, redirect } from '@tanstack/react-router'

// The lookup box now heads the Indicators hub (epic #25).
export const Route = createFileRoute('/_layout/investigate/lookup')({
  beforeLoad: () => {
    throw redirect({ href: '/iocs', statusCode: 301 })
  },
})
