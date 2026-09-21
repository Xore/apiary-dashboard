import { createFileRoute } from '@tanstack/react-router'
import { TruckIcon, TriangleAlertIcon, CalendarX2Icon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import ProductInsightsCard from '@/views/dashboards/widgets/widget-product-insights'
import SalesMetricsCard from '@/views/dashboards/charts/chart-sales-metrics'
import StatisticsCard from '@/views/dashboards/statistics/statistics-card-01'
import TotalEarningCard from '@/views/dashboards/widgets/widget-total-earning'
import TransactionDatatable, { type Item } from '@/views/datatables/datatable-transaction'

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
    value: '27',
    title: 'Missed Delivery Slots',
    changePercentage: '+4.3%'
  }
]

const earningData = [
  {
    img: '/images/widgets/zipcar.webp',
    platform: 'Zipcar',
    technologies: 'Vuejs & HTML',
    earnings: '-$23,569.26',
    progressPercentage: 75
  },
  {
    img: '/images/widgets/bitbank.webp',
    platform: 'Bitbank',
    technologies: 'Figma & React',
    earnings: '-$12,650.31',
    progressPercentage: 25
  }
]

const transactionData: Item[] = [
  { id: '1', avatar: '/images/avatars/avatar-1.webp', avatarFallback: 'JA', name: 'Jack Alfredo', amount: 316.0, status: 'paid', email: 'jack@shadcnstudio.com', paidBy: 'mastercard' },
  { id: '2', avatar: '/images/avatars/avatar-2.webp', avatarFallback: 'MG', name: 'Maria Gonzalez', amount: 253.4, status: 'pending', email: 'maria.g@shadcnstudio.com', paidBy: 'visa' },
  { id: '3', avatar: '/images/avatars/avatar-3.webp', avatarFallback: 'JD', name: 'John Doe', amount: 852.0, status: 'paid', email: 'john.doe@shadcnstudio.com', paidBy: 'mastercard' },
  { id: '4', avatar: '/images/avatars/avatar-4.webp', avatarFallback: 'EC', name: 'Emily Carter', amount: 889.0, status: 'pending', email: 'emily.carter@shadcnstudio.com', paidBy: 'visa' },
  { id: '5', avatar: '/images/avatars/avatar-5.webp', avatarFallback: 'DL', name: 'David Lee', amount: 723.16, status: 'paid', email: 'david.lee@shadcnstudio.com', paidBy: 'mastercard' },
  { id: '6', avatar: '/images/avatars/avatar-6.webp', avatarFallback: 'SP', name: 'Sophia Patel', amount: 612.0, status: 'failed', email: 'sophia.patel@shadcnstudio.com', paidBy: 'mastercard' },
  { id: '7', avatar: '/images/avatars/avatar-7.webp', avatarFallback: 'RW', name: 'Robert Wilson', amount: 445.25, status: 'paid', email: 'robert.wilson@shadcnstudio.com', paidBy: 'visa' },
  { id: '8', avatar: '/images/avatars/avatar-8.webp', avatarFallback: 'LM', name: 'Lisa Martinez', amount: 297.8, status: 'processing', email: 'lisa.martinez@shadcnstudio.com', paidBy: 'mastercard' },
  { id: '9', avatar: '/images/avatars/avatar-9.webp', avatarFallback: 'MT', name: 'Michael Thompson', amount: 756.9, status: 'paid', email: 'michael.thompson@shadcnstudio.com', paidBy: 'visa' },
  { id: '10', avatar: '/images/avatars/avatar-10.webp', avatarFallback: 'AJ', name: 'Amanda Johnson', amount: 189.5, status: 'pending', email: 'amanda.johnson@shadcnstudio.com', paidBy: 'mastercard' },
  { id: '11', avatar: '/images/avatars/avatar-11.webp', avatarFallback: 'KB', name: 'Kevin Brown', amount: 1024.75, status: 'paid', email: 'kevin.brown@shadcnstudio.com', paidBy: 'visa' },
  { id: '12', avatar: '/images/avatars/avatar-12.webp', avatarFallback: 'SD', name: 'Sarah Davis', amount: 540.2, status: 'paid', email: 'sarah.davis@shadcnstudio.com', paidBy: 'mastercard' },
]

export const Route = createFileRoute('/_pages/dashboard/orders')({
  component: OrdersDashboard,
})

function OrdersDashboard() {
  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
      {StatisticsCardData.map((stat, index) => (
        <StatisticsCard key={index} {...stat} />
      ))}
      <Card className='col-span-full lg:col-span-2'>
        <SalesMetricsCard data={earningData} />
      </Card>
      <Card className='col-span-full lg:col-span-2'>
        <ProductInsightsCard />
      </Card>
      <Card className='col-span-full'>
        <TotalEarningCard />
      </Card>
      <Card className='col-span-full'>
        <TransactionDatatable data={transactionData} />
      </Card>
    </div>
  )
}
