import { createFileRoute } from '@tanstack/react-router'
import Error from '@/views/pages/misc/error-page'

export const Route = createFileRoute('/_blank/pages/misc/error-page')({
  component: () => <Error />,
})
