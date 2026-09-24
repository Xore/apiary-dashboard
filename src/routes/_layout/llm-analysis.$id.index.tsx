import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { LlmSummary } from '#/components/details/LlmAnalysis'

const parent = getRouteApi('/_layout/llm-analysis/$id')

export const Route = createFileRoute('/_layout/llm-analysis/$id/')({
  component: () => <LlmSummary row={parent.useLoaderData().analysis} />,
})
