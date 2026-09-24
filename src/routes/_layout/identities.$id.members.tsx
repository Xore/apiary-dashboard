import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/members')({
  component: () => {
    const d = parent.useLoaderData()
    return (
      <Panel title="Member addresses">
        <SourcesTable sources={d.group.members} />
      </Panel>
    )
  },
})
