import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { EntityFrame } from '#/components/EntityFrame'
import { NotFound } from '#/components/NotFound'
import { getIdentity } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/identities/$id')({
  loader: async ({ params }) => {
    const identity = await getIdentity(params.id)
    if (!identity) throw notFound()
    return identity
  },
  notFoundComponent: () => <NotFound title="Attacker identity" description="No attacker identity has this id." />,
  component: IdentityLayout,
})

function IdentityLayout() {
  const { identity: a, group, shared } = Route.useLoaderData()
  const indicators = a.fingerprints.length + a.payloads.length + a.credentials.length
  return (
    <EntityFrame
      kind="Attacker identity"
      title={a.id.slice(0, 8)}
      description="Addresses joined by shared fingerprints, payloads, or credentials. Behavior context only, never actor attribution."
      basePath={`/identities/${a.id}`}
      tokens={
        <>
          {a.scan && <Token size="sm" color="orange" label={`${a.scan} scan`} />}
          {a.verdicts.map((v) => (
            <Token key={v} size="sm" color="purple" label={v} />
          ))}
        </>
      }
      facts={[
        { label: 'Member IPs', value: formatNumber(a.ips.length) },
        { label: 'Events', value: formatNumber(a.events) },
        { label: 'First seen', value: formatDateTime(a.first) },
        { label: 'Last seen', value: formatDateTime(a.last) },
        { label: 'Updated', value: formatDateTime(a.updated) },
      ]}
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'members', label: 'Member IPs', count: group.members.length },
        { id: 'indicators', label: 'Indicators', count: indicators },
        { id: 'why', label: 'Why merged', count: shared.length },
        { id: 'timeline', label: 'Timeline' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
