import { createFileRoute } from '@tanstack/react-router'
import FormValidation from '@/views/forms/form-validation'

export const Route = createFileRoute('/_pages/forms/form-validation')({
  component: () => <FormValidation />,
})
