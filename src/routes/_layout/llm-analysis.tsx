import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/llm-analysis')({
  component: LlmAnalysisPage,
})

function LlmAnalysisPage() {
  return <PendingPage title="LLM analysis" issue={9} />
}
