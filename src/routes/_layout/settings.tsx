import { Card } from '@astryxdesign/core/Card'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <Layout
      height="fill"
      contentWidth={768}
      content={
        <LayoutContent padding={6}>
          <Card variant="muted" padding={0} width="100%" height={240} />
        </LayoutContent>
      }
    />
  )
}
