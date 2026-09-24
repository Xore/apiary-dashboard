import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/campaigns/$cidr')

export const Route = createFileRoute('/_layout/campaigns/$cidr/sources')({
  component: () => {
    const d = parent.useLoaderData()
    return (
      <Panel title="Addresses in this campaign">
        <SourcesTable sources={d.group.members} />
      </Panel>
    )
  },
})
