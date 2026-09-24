import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/networks/$cidr')

export const Route = createFileRoute('/_layout/networks/$cidr/sources')({
  component: () => {
    const n = parent.useLoaderData()
    return (
      <Panel title="Addresses in this prefix">
        <SourcesTable sources={n.group.members} />
      </Panel>
    )
  },
})
