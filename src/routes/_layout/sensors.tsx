import { createFileRoute } from '@tanstack/react-router'
import { PendingPage } from '#/components/PageFrame'

export const Route = createFileRoute('/_layout/sensors')({
  component: SensorsPage,
})

function SensorsPage() {
  return <PendingPage title="Sensor detail" issue={10} />
}
