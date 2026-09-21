import { createFileRoute } from '@tanstack/react-router'
import MailApp from '@/views/apps/mail'

export const Route = createFileRoute('/_pages/apps/mail')({
  component: () => <MailApp />,
})
