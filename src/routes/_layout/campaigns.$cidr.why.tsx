import { Panel } from '#/components/DashboardBlocks'
import { SharedSignalsTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/campaigns/$cidr')

export const Route = createFileRoute('/_layout/campaigns/$cidr/why')({
  component: () => {
    const d = parent.useLoaderData()
    return (
      <Panel title="Signals two or more addresses share">
        <SharedSignalsTable signals={d.shared} />
      </Panel>
    )
  },
})
