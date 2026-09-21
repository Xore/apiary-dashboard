import { createFileRoute } from '@tanstack/react-router'
import { EventCalendar } from '@/views/apps/calendar'

export const Route = createFileRoute('/_pages/apps/calendar')({
  component: () => <EventCalendar />,
})
