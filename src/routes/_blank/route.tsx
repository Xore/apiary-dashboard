import { createFileRoute, Outlet } from '@tanstack/react-router'
import BlankLayout from '@/components/layout/BlankLayout'

export const Route = createFileRoute('/_blank')({
  component: BlankLayoutWrapper,
})

function BlankLayoutWrapper() {
  return (
    <BlankLayout>
      <Outlet />
    </BlankLayout>
  )
}
