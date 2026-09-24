import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { TechniquesPanel } from '#/components/DetailBlocks'

const parent = getRouteApi('/_layout/sources/$ip')

export const Route = createFileRoute('/_layout/sources/$ip/behavior')({
  component: () => (
    <VStack gap={2}>
      <TechniquesPanel techniques={parent.useLoaderData().techniques} />
      <Text type="supporting">Behavior context only, never actor attribution.</Text>
    </VStack>
  ),
})
