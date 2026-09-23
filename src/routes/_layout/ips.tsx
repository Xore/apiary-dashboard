import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/ips')({
  component: IpsPage,
})

function IpsPage() {
  return <PendingPage title="Attack sources" issue={10} />
}
