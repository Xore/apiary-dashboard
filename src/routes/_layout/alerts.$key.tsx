import { Token } from '@astryxdesign/core/Token'
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { AckButton } from '#/components/details/Alert'
import { EntityFrame } from '#/components/EntityFrame'
import { entityTabs } from '#/components/ViewTabs'
import type { ViewTab } from '#/components/ViewTabs'
import { NotFound } from '#/components/NotFound'
import { SeverityToken } from '#/components/SeverityToken'
import { getAlertDetail } from '#/data/queries'
import { formatDateTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/_layout/alerts/$key')({
  staticData: { viewTabs: entityTabs({ label: 'Alert views', basePath: (params) => `/alerts/${encodeURIComponent(params.key)}`, tabs: tabsFor }) },
  loader: async ({ params }) => {
    const detail = await getAlertDetail(params.key)
    if (!detail) throw notFound()
    return detail
  },
  notFoundComponent: () => (
    <NotFound
      title="Alert"
      description="No alert of this class is on record."
    />
  ),
  component: AlertLayout,
})

function AlertLayout() {
  const { group } = Route.useLoaderData()
  return (
    <EntityFrame
      kind={`Alert · ${group.kind}`}
      title={group.message}
      basePath={`/alerts/${encodeURIComponent(group.id)}`}
      tokens={
        <>
          <SeverityToken severity={group.severity} />
          <Token
            label={group.acknowledged ? 'acknowledged' : 'new'}
            size="sm"
            color={group.acknowledged ? 'gray' : 'orange'}
          />
        </>
      }
      actions={<AckButton group={group} />}
      facts={[
        { label: 'Observed', value: formatNumber(group.count) },
        { label: 'Records', value: formatNumber(group.members.length) },
        { label: 'First seen', value: formatDateTime(group.firstSeen) },
        { label: 'Last seen', value: formatDateTime(group.lastSeen) },
      ]}
    >
      <Outlet />
    </EntityFrame>
  )
}

/** The top-bar tabs: static until the loader data arrives, then with counts. */
function tabsFor(loaded: unknown): ViewTab[] {
  if (!loaded) return [{ id: 'overview', label: 'Overview' }, { id: 'members', label: 'Members' }, { id: 'evidence', label: 'Evidence' }]
  const data = loaded as ReturnType<typeof Route.useLoaderData>
  const { group, sources, hashes } = data
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members', count: group.members.length },
    { id: 'evidence', label: 'Evidence', count: sources.length + hashes.length },
  ]
}
