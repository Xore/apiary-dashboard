import { createFileRoute, notFound } from '@tanstack/react-router'
import { AuthInspector } from '#/components/details/AuthFailure'
import { getAuthEvents } from '#/data/queries'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/auth-events/$id')({
  loader: async ({ params }) => {
    const row = (await getAuthEvents()).events.find((e) => e.id === params.id)
    if (!row) throw notFound()
    return row
  },
  notFoundComponent: () => (
    <NotFound title="Auth failure" description="No auth failure has this id." />
  ),
  component: AuthFailurePage,
})

function AuthFailurePage() {
  const d = Route.useLoaderData()
  return (
    <EntityFrame
      kind="Auth failure"
      title={d.type}
      basePath={`/auth-events/${encodeURIComponent(d.id)}`}
      facts={[
        { label: 'Time', value: formatDateTime(d.timestamp) },
        { label: 'Client', value: d.clientId },
        { label: 'Realm', value: d.realm },
      ]}
      tabs={[{ id: 'overview', label: 'Overview' }]}
    >
      <AuthInspector event={d} />
    </EntityFrame>
  )
}
