import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { SourcesTable } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/sources')({
  component: () => (
    <Panel title="Addresses that used it">
      <SourcesTable sources={parent.useLoaderData().group.members} />
    </Panel>
  ),
})
