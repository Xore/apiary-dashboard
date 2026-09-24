import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/asn/$asn')

export const Route = createFileRoute('/_layout/asn/$asn/sources')({
  component: () => {
    const a = parent.useLoaderData()
    return (
      <Panel title="Addresses in this autonomous system">
        <SourcesTable sources={a.group.members} />
      </Panel>
    )
  },
})
