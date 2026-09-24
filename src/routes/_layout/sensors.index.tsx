import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSensorCatalog } from '#/data/queries'

// /sensors has no page of its own: it opens the busiest sensor. This is an
// index route, not sensors.tsx, so /sensors/$sensor is a sibling rather than
// a child that would re-run this redirect on every load.
export const Route = createFileRoute('/_layout/sensors/')({
  beforeLoad: async () => {
    const catalog = await getSensorCatalog()
    throw redirect({ to: '/sensors/$sensor', params: { sensor: catalog[0]?.sensor ?? 'cowrie' } })
  },
})
