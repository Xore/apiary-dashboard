import { createFileRoute } from '@tanstack/react-router'
import UserProfile from '@/views/pages/user-profile'

export const Route = createFileRoute('/_pages/pages/user-profile')({
  component: () => <UserProfile />,
})
