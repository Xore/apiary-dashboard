import { createFileRoute } from '@tanstack/react-router'
import { ShellAppShell } from '#/components/ShellAppShell'
import { getSessionUser } from '#/data/queries'

export const Route = createFileRoute('/_layout')({
  loader: () => getSessionUser(),
  component: LayoutComponent,
})

function LayoutComponent() {
  const user = Route.useLoaderData()
  return <ShellAppShell user={user} />
}
