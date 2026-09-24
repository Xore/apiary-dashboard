import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/clusters/$kind/$value')

export const Route = createFileRoute('/_layout/clusters/$kind/$value/members')({
  component: () => {
    const c = parent.useLoaderData()
    return (
      <Panel title="Addresses that share it">
        <SourcesTable sources={c.group.members} />
      </Panel>
    )
  },
})
