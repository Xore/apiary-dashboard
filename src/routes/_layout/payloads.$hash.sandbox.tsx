import { Text } from '@astryxdesign/core/Text'
import { createFileRoute } from '@tanstack/react-router'
import { SandboxResult } from '#/components/analyzers/SandboxResult'
import { getSandboxRun } from '#/data/queries'

export const Route = createFileRoute('/_layout/payloads/$hash/sandbox')({
  loader: ({ params }) => getSandboxRun(params.hash),
  component: () => {
    const run = Route.useLoaderData()
    return run ? <SandboxResult run={run} /> : <Text type="supporting">This sample has not been detonated. Shell scripts without a dynamic route are static-only.</Text>
  },
})
