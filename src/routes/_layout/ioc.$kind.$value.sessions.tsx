import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { SessionsTable } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/ioc/$kind/$value')

export const Route = createFileRoute('/_layout/ioc/$kind/$value/sessions')({
  component: () => (
    <Panel title="Sessions it appeared in">
      <SessionsTable sessions={parent.useLoaderData().sessions} />
    </Panel>
  ),
})
