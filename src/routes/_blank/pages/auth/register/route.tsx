import { createFileRoute } from '@tanstack/react-router'
import Register from '@/views/pages/auth/register'

export const Route = createFileRoute('/_blank/pages/auth/register')({
  component: () => <Register />,
})
