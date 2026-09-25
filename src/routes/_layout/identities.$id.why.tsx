import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { FusionRadar } from '#/components/charts'
import { Panel } from '#/components/DashboardBlocks'
import { SharedSignalsTable } from '#/components/EntityBlocks'
import { getIdentityFusion } from '#/data/queries'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/why')({
  loader: ({ params }) => getIdentityFusion(params.id),
  component: () => {
    const d = parent.useLoaderData()
    const fusion = Route.useLoaderData()
    return (
      <VStack gap={4}>
        <Panel title="Fingerprint fusion: why these addresses merged">
          <Text type="supporting">Per fingerprint family, how many distinct values two or more member addresses share. A family no sensor produced here stays at zero.</Text>
          {fusion && <FusionRadar categories={fusion.categories} values={fusion.values} />}
        </Panel>
        <Panel title="Signals that joined these addresses">
          <SharedSignalsTable signals={d.shared} />
        </Panel>
      </VStack>
    )
  },
})
