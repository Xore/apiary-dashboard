import { createFileRoute } from '@tanstack/react-router'
import { TruckIcon, TriangleAlertIcon, CalendarX2Icon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import ProductInsightsCard from '@/views/dashboards/widgets/widget-product-insights'
import SalesMetricsCard from '@/views/dashboards/charts/chart-sales-metrics'
import StatisticsCard from '@/views/dashboards/statistics/statistics-card-01'
import TotalEarningCard from '@/views/dashboards/widgets/widget-total-earning'
import TransactionDatatable from '@/views/datatables/datatable-transaction'

// Statistics card data
const StatisticsCardData = [
  {
    icon: <TruckIcon className='size-4' />,
    value: '42',
    title: 'Shipped Orders',
    changePercentage: '+18.2%'
  },
  {
    icon: <TriangleAlertIcon className='size-4' />,
    value: '8',
    title: 'Damaged Returns',
    changePercentage: '-8.7%'
  },
  {
    icon: <CalendarX2Icon className='size-4' />,
    value: '12',
    title: 'Cancelled Orders',
    changePercentage: '+2.1%'
  }
]

const transactionData = [
  {
    id: '1',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/images/avatars/avatar-1.webp'
    },
    amount: 120.50,
    status: 'completed',
    date: '2024-01-01'
  },
  {
    id: '2',
    customer: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: '/images/avatars/avatar-2.webp'
    },
    amount: 250.00,
    status: 'pending',
    date: '2024-01-02'
  }
]

const earningData = [
  { date: 'Jan', value: 4000 },
  { date: 'Feb', value: 3000 },
  { date: 'Mar', value: 2000 },
  { date: 'Apr', value: 2780 },
  { date: 'May', value: 1890 },
  { date: 'Jun', value: 2390 },
  { date: 'Jul', value: 3490 },
]

export const Route = createFileRoute('/_pages/dashboard/orders')({
  component: OrdersDashboard,
})

function OrdersDashboard() {
  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
      {StatisticsCardData.map((item, index) => (
        <StatisticsCard key={index} {...item} />
      ))}

      <div className='col-span-full grid gap-6 sm:grid-cols-2'>
        <ProductInsightsCard />
        <TotalEarningCard
          title='Total Earning'
          earning={24650}
          trend='up'
          percentage={10}
          comparisonText='Compare to last year ($84,325)'
          earningData={earningData}
          className='justify-between gap-5 sm:min-w-0'
        />
      </div>

      <SalesMetricsCard className='col-span-full *:data-[slot=card-content]:space-y-6 xl:col-span-2' />

      <Card className='col-span-full w-full py-0'>
        <TransactionDatatable data={transactionData} />
      </Card>
    </div>
  )
}
