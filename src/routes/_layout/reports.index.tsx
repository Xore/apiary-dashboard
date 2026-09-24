import { createFileRoute, redirect } from '@tanstack/react-router'

// The studio split into Generate, History, Templates and Library; the old
// ?step= links land on the matching page.
export const Route = createFileRoute('/_layout/reports/')({
  beforeLoad: ({ search }) => {
    const step = (search as { step?: unknown }).step
    throw redirect({ href: step === 'library' ? '/reports/library' : '/reports/generate', statusCode: 301 })
  },
})
