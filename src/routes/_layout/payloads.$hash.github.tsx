import { Text } from '@astryxdesign/core/Text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { GithubResult } from '#/components/analyzers/GithubResult'

const parent = getRouteApi('/_layout/payloads/$hash')

export const Route = createFileRoute('/_layout/payloads/$hash/github')({
  component: () => {
    const g = parent.useLoaderData().github
    return g ? <GithubResult g={g} /> : <Text type="supporting">This sample has not been published to GitHub.</Text>
  },
})
