import { createFileRoute, redirect } from '@tanstack/react-router'

// Moved to the Recording entity page (epic #25).
export const Route = createFileRoute('/_layout/tty-replay/$shasum')({
  beforeLoad: ({ params, search }) => {
    const tab =
      (search as { tab?: unknown }).tab === 'attacker' ? '/attacker' : ''
    throw redirect({
      href: `/recordings/${encodeURIComponent(params.shasum)}${tab}`,
      statusCode: 301,
    })
  },
})
