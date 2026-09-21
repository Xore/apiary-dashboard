import { createFileRoute } from '@tanstack/react-router'
import UserListApp from '@/views/apps/users/list'

export const Route = createFileRoute('/_pages/apps/users/list')({
  component: () => <UserListApp />,
})
