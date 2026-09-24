import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CapeResult } from '#/components/analyzers/CapeResult'

const parent = getRouteApi('/_layout/payloads/$hash')

export const Route = createFileRoute('/_layout/payloads/$hash/cape')({
  component: () => {
    const run = parent.useLoaderData().cape
    return run ? <CapeResult run={run} /> : <Text type="supporting">CAPE has not detonated this sample.</Text>
  },
})
