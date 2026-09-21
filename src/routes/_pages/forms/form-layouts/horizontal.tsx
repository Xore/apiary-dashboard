import { createFileRoute } from '@tanstack/react-router'
import HorizontalForm from '@/views/forms/form-layouts/horizontal'

export const Route = createFileRoute('/_pages/forms/form-layouts/horizontal')({
  component: () => <HorizontalForm />,
})
