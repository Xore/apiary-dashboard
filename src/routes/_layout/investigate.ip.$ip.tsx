import { createFileRoute, redirect } from '@tanstack/react-router'

// The attacker profile became the Source IP entity page (epic #25); its old
// tabs map onto the new ones.
const TAB_MAP: Record<string, string> = { indicators: '/payloads', correlation: '/network' }

export const Route = createFileRoute('/_layout/investigate/ip/$ip')({
  beforeLoad: ({ params, search }) => {
    const tab = typeof (search as { tab?: unknown }).tab === 'string' ? TAB_MAP[(search as { tab: string }).tab] ?? '' : ''
    throw redirect({ href: `/sources/${encodeURIComponent(params.ip)}${tab}`, statusCode: 301 })
  },
})
