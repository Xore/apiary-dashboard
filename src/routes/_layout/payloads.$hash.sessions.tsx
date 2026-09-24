import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { SessionsTable } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/payloads/$hash')

export const Route = createFileRoute('/_layout/payloads/$hash/sessions')({
  component: () => (
    <Panel title="Sessions that downloaded it">
      <SessionsTable sessions={parent.useLoaderData().delivery.sessions} />
    </Panel>
  ),
})
