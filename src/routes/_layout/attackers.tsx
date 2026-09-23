import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/attackers')({
  component: AttackersPage,
})

function AttackersPage() {
  return <PendingPage title="Attacker identities" issue={10} />
}
