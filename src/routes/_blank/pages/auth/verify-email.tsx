import { createFileRoute } from '@tanstack/react-router'
import VerifyEmail from '@/views/pages/auth/verify-email'

export const Route = createFileRoute('/_blank/pages/auth/verify-email')({
  component: () => <VerifyEmail />,
})
