import { createFileRoute } from '@tanstack/react-router'
import UserViewApp from '@/views/apps/users/view'

export const Route = createFileRoute('/_pages/apps/users/view')({
  component: () => <UserViewApp />,
})
