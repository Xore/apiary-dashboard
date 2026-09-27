import { SkeletonPanels } from '#/components/EntityBlocks'
import { Pending } from '#/components/Pending'
import { orPending } from '#/lib/pending'
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
  pendingComponent: AuthFailurePage,
})

function AuthFailurePage() {
  const d = orPending(Route.useLoaderData())
  const { id } = Route.useParams()
  return (
    <EntityFrame
      kind="Auth failure"
      title={<Pending width={280}>{d?.type}</Pending>}
      basePath={`/auth-events/${encodeURIComponent(id)}`}
      facts={[
        { label: 'Time', value: d && formatDateTime(d.timestamp) },
        { label: 'Client', value: d?.clientId },
        { label: 'Realm', value: d?.realm },
      ]}
    >
      {d ? <AuthInspector event={d} /> : <SkeletonPanels />}
    </EntityFrame>
  )
}
