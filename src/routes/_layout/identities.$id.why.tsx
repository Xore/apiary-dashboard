import { Panel } from '#/components/DashboardBlocks'
import { SharedSignalsTable } from '#/components/EntityBlocks'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/why')({
  component: () => {
    const d = parent.useLoaderData()
    return (
      <Panel title="Signals that joined these addresses">
        <SharedSignalsTable signals={d.shared} />
      </Panel>
    )
  },
})
