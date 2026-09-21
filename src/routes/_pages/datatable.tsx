import { createFileRoute } from '@tanstack/react-router'
import DataTable from '@/views/datatables'

export const Route = createFileRoute('/_pages/datatable')({
  component: () => <DataTable />,
})
