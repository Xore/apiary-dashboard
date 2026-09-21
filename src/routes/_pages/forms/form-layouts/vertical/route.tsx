import { createFileRoute } from '@tanstack/react-router'
import VerticalForm from '@/views/forms/form-layouts/vertical'

export const Route = createFileRoute('/_pages/forms/form-layouts/vertical')({
  component: () => <VerticalForm />,
})
