import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { RevDeckResult } from '#/components/analyzers/RevDeckResult'

const parent = getRouteApi('/_layout/payloads/$hash')

export const Route = createFileRoute('/_layout/payloads/$hash/revdeck')({
  component: () => {
    const run = parent.useLoaderData().revdeck
    return run ? <RevDeckResult run={run} /> : <Text type="supporting">RevDeck has not analyzed this sample.</Text>
  },
})
