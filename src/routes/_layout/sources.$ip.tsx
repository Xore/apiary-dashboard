import { Link } from '@astryxdesign/core/Link'
import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { BlockControl } from '#/components/BlockControl'
import { EntityFrame } from '#/components/EntityFrame'
import { EntityLink } from '#/components/EntityLink'
import { NotFound } from '#/components/NotFound'
import { getIpProfile } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/sources/$ip')({
  loader: async ({ params }) => {
    const profile = await getIpProfile(params.ip)
    if (!profile) throw notFound()
    return profile
  },
  notFoundComponent: () => <NotFound title="Source IP" description="No events from this address." />,
  component: SourceLayout,
})

function SourceLayout() {
  const p = Route.useLoaderData()
  const { ip } = Route.useParams()

  return (
    <EntityFrame
      kind="Source IP"
      title={ip}
      basePath={`/sources/${ip}`}
      tokens={
        <>
          <EntityLink kind="country" id={p.source.country}>
            <Token size="sm" color="blue" label={p.source.country} />
          </EntityLink>
          {p.source.tags.map((tag) => (
            <Token key={tag} size="sm" color="orange" label={tag} />
          ))}
          {p.blocked && <Token size="sm" color="red" label="blocked" />}
        </>
      }
      facts={[
        { label: 'Network', value: <EntityLink kind="asn" id={p.source.asn}>{`${p.source.asn} · ${p.source.org}`}</EntityLink> },
        { label: 'First seen', value: formatDateTime(p.source.first) },
        { label: 'Last seen', value: formatDateTime(p.source.last) },
        { label: 'Events', value: formatNumber(p.source.events) },
        { label: 'Risk score', value: String(p.source.riskScore) },
      ]}
      actions={
        <>
          <Link href={`/recordings?ip=${ip}`}>Recordings</Link>
          <BlockControl ip={ip} blocked={p.blocked} />
        </>
      }
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'events', label: 'Events', count: p.source.events },
        { id: 'sessions', label: 'Sessions', count: p.source.sessions },
        { id: 'credentials', label: 'Credentials', count: p.credentials.length },
        { id: 'commands', label: 'Commands', count: p.commands.length },
        { id: 'payloads', label: 'Payloads', count: p.payloads.length },
        { id: 'alerts', label: 'Alerts', count: p.alerts.length },
        { id: 'network', label: 'Network' },
        { id: 'identity', label: 'Identity' },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}
