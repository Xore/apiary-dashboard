import { createFileRoute } from '@tanstack/react-router'
import ResetPassword from '@/views/pages/auth/reset-password'

export const Route = createFileRoute('/_blank/pages/auth/reset-password')({
  component: () => <ResetPassword />,
})
